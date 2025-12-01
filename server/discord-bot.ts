import { Client, GatewayIntentBits, Events, VoiceState } from 'discord.js';
import { storage } from './storage';

let discordClient: Client | null = null;
let isConnected = false;

export interface PresenceUpdate {
  discordUserId: string;
  guildId: string;
  channelId: string | null;
  channelName: string | null;
  isScreenSharing: boolean;
  isStreaming: boolean;
}

const presenceUpdateCallbacks: ((update: PresenceUpdate) => void)[] = [];

export function onPresenceUpdate(callback: (update: PresenceUpdate) => void) {
  presenceUpdateCallbacks.push(callback);
}

function notifyPresenceUpdate(update: PresenceUpdate) {
  presenceUpdateCallbacks.forEach(cb => cb(update));
}

export async function initDiscordBot(token: string): Promise<boolean> {
  if (discordClient) {
    await discordClient.destroy();
  }

  try {
    discordClient = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMembers,
      ],
    });

    discordClient.once(Events.ClientReady, async (client) => {
      console.log(`Discord bot logged in as ${client.user.tag}`);
      isConnected = true;
      
      await storage.updateBotHeartbeat();
      
      setInterval(async () => {
        if (isConnected) {
          await storage.updateBotHeartbeat();
        }
      }, 30000);
    });

    discordClient.on(Events.VoiceStateUpdate, async (oldState: VoiceState, newState: VoiceState) => {
      await handleVoiceStateUpdate(oldState, newState);
    });

    discordClient.on(Events.Error, (error) => {
      console.error('Discord client error:', error);
      isConnected = false;
    });

    discordClient.on('disconnect', () => {
      console.log('Discord bot disconnected');
      isConnected = false;
    });

    await discordClient.login(token);
    return true;
  } catch (error) {
    console.error('Failed to initialize Discord bot:', error);
    return false;
  }
}

async function handleVoiceStateUpdate(oldState: VoiceState, newState: VoiceState) {
  const discordUserId = newState.member?.id || oldState.member?.id;
  if (!discordUserId) return;

  const guildId = newState.guild.id;
  const settings = await storage.getDiscordSettings();
  
  if (settings && settings.guildId !== guildId) {
    return;
  }

  const connection = await storage.getDiscordConnectionByDiscordId(discordUserId);
  if (!connection) {
    return;
  }

  const wasInChannel = !!oldState.channelId;
  const isInChannel = !!newState.channelId;
  const wasScreenSharing = oldState.streaming || false;
  const isScreenSharing = newState.streaming || false;
  const wasSelfStream = oldState.selfVideo || false;
  const isSelfStream = newState.selfVideo || false;

  const update: PresenceUpdate = {
    discordUserId,
    guildId,
    channelId: newState.channelId,
    channelName: newState.channel?.name || null,
    isScreenSharing: isScreenSharing || isSelfStream,
    isStreaming: newState.streaming || false,
  };

  if (!wasInChannel && isInChannel) {
    const existingSession = await storage.getActivePresenceByDiscordId(discordUserId);
    if (!existingSession) {
      await storage.createPresenceSession({
        userId: connection.userId,
        discordUserId,
        guildId,
        channelId: newState.channelId!,
        channelName: newState.channel?.name,
        isScreenSharing: update.isScreenSharing,
        isStreaming: update.isStreaming,
      });
    }
  } else if (wasInChannel && !isInChannel) {
    await storage.endPresenceSession(discordUserId);
  } else if (isInChannel) {
    const session = await storage.getActivePresenceByDiscordId(discordUserId);
    if (session) {
      await storage.updatePresenceSession(session.id, {
        channelId: newState.channelId!,
        channelName: newState.channel?.name,
        isScreenSharing: update.isScreenSharing,
        isStreaming: update.isStreaming,
        lastHeartbeatAt: new Date(),
      });
    }
  }

  notifyPresenceUpdate(update);
}

export function getDiscordClient(): Client | null {
  return discordClient;
}

export function isDiscordConnected(): boolean {
  return isConnected && discordClient !== null && discordClient.isReady();
}

export async function getGuildInfo(guildId: string) {
  if (!discordClient || !discordClient.isReady()) {
    return null;
  }

  try {
    const guild = await discordClient.guilds.fetch(guildId);
    return {
      id: guild.id,
      name: guild.name,
      memberCount: guild.memberCount,
      icon: guild.iconURL(),
    };
  } catch (error) {
    console.error('Error fetching guild info:', error);
    return null;
  }
}

export async function getVoiceChannels(guildId: string) {
  if (!discordClient || !discordClient.isReady()) {
    return [];
  }

  try {
    const guild = await discordClient.guilds.fetch(guildId);
    const channels = await guild.channels.fetch();
    
    return channels
      .filter(channel => channel?.type === 2)
      .map(channel => ({
        id: channel!.id,
        name: channel!.name,
      }));
  } catch (error) {
    console.error('Error fetching voice channels:', error);
    return [];
  }
}

export async function getCurrentVoiceStates(guildId: string) {
  if (!discordClient || !discordClient.isReady()) {
    return [];
  }

  try {
    const guild = await discordClient.guilds.fetch(guildId);
    const voiceStates: PresenceUpdate[] = [];

    guild.voiceStates.cache.forEach(voiceState => {
      if (voiceState.channelId) {
        voiceStates.push({
          discordUserId: voiceState.member?.id || '',
          guildId: guild.id,
          channelId: voiceState.channelId,
          channelName: voiceState.channel?.name || null,
          isScreenSharing: voiceState.streaming || voiceState.selfVideo || false,
          isStreaming: voiceState.streaming || false,
        });
      }
    });

    return voiceStates;
  } catch (error) {
    console.error('Error fetching voice states:', error);
    return [];
  }
}

export async function disconnectBot() {
  if (discordClient) {
    await discordClient.destroy();
    discordClient = null;
    isConnected = false;
  }
}
