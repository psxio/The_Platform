import { storage } from "./storage";
import type { ContentTask, User, PaymentRequest } from "@shared/schema";

interface NotificationPayload {
  title: string;
  message: string;
  taskId?: number;
  taskTitle?: string;
  assignee?: string;
  dueDate?: string;
  priority?: string;
  status?: string;
  link?: string;
}

export class ChannelNotificationService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.REPLIT_DEV_DOMAIN 
      ? `https://${process.env.REPLIT_DEV_DOMAIN}`
      : process.env.REPLIT_DOMAINS 
        ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}`
        : 'http://localhost:5000';
  }

  private async getSettings() {
    return await storage.getTeamIntegrationSettings();
  }

  private formatDiscordEmbed(payload: NotificationPayload): object {
    const color = this.getColorForEvent(payload.title);
    
    return {
      embeds: [{
        title: payload.title,
        description: payload.message,
        color: color,
        fields: [
          ...(payload.taskTitle ? [{ name: "Task", value: payload.taskTitle, inline: true }] : []),
          ...(payload.assignee ? [{ name: "Assignee", value: payload.assignee, inline: true }] : []),
          ...(payload.dueDate ? [{ name: "Due Date", value: payload.dueDate, inline: true }] : []),
          ...(payload.priority ? [{ name: "Priority", value: payload.priority, inline: true }] : []),
          ...(payload.status ? [{ name: "Status", value: payload.status, inline: true }] : []),
        ].filter(f => f.value),
        timestamp: new Date().toISOString(),
        footer: {
          text: "ContentFlowStudio"
        }
      }]
    };
  }

  private formatTelegramMessage(payload: NotificationPayload): string {
    let message = `*${this.escapeMarkdown(payload.title)}*\n\n`;
    message += `${this.escapeMarkdown(payload.message)}\n\n`;
    
    if (payload.taskTitle) {
      message += `📋 *Task:* ${this.escapeMarkdown(payload.taskTitle)}\n`;
    }
    if (payload.assignee) {
      message += `👤 *Assignee:* ${this.escapeMarkdown(payload.assignee)}\n`;
    }
    if (payload.dueDate) {
      message += `📅 *Due:* ${this.escapeMarkdown(payload.dueDate)}\n`;
    }
    if (payload.priority) {
      message += `🔥 *Priority:* ${this.escapeMarkdown(payload.priority)}\n`;
    }
    if (payload.status) {
      message += `📊 *Status:* ${this.escapeMarkdown(payload.status)}\n`;
    }
    
    return message;
  }

  private escapeMarkdown(text: string): string {
    return text.replace(/[_*[\]()~`>#+=|{}.!-]/g, '\\$&');
  }

  private getColorForEvent(title: string): number {
    if (title.includes("Created") || title.includes("New")) return 0x22C55E;
    if (title.includes("Completed")) return 0x3B82F6;
    if (title.includes("Assigned")) return 0xA855F7;
    if (title.includes("Overdue")) return 0xEF4444;
    if (title.includes("Due Soon")) return 0xF59E0B;
    if (title.includes("Comment")) return 0x6366F1;
    return 0x64748B;
  }

  async sendToTelegram(payload: NotificationPayload): Promise<boolean> {
    const settings = await this.getSettings();
    if (!settings?.telegramEnabled || !settings.telegramBotToken || !settings.telegramChatId) {
      return false;
    }

    try {
      const url = `https://api.telegram.org/bot${settings.telegramBotToken}/sendMessage`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: settings.telegramChatId,
          text: this.formatTelegramMessage(payload),
          parse_mode: 'MarkdownV2',
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('Telegram notification failed:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Telegram notification error:', error);
      return false;
    }
  }

  async sendToDiscord(payload: NotificationPayload): Promise<boolean> {
    const settings = await this.getSettings();
    if (!settings?.discordEnabled || !settings.discordWebhookUrl) {
      return false;
    }

    try {
      const response = await fetch(settings.discordWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(this.formatDiscordEmbed(payload)),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('Discord notification failed:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Discord notification error:', error);
      return false;
    }
  }

  async notifyChannels(payload: NotificationPayload): Promise<void> {
    const settings = await this.getSettings();
    if (!settings) return;

    const promises: Promise<boolean>[] = [];

    if (settings.telegramEnabled) {
      promises.push(this.sendToTelegram(payload));
    }

    if (settings.discordEnabled) {
      promises.push(this.sendToDiscord(payload));
    }

    await Promise.allSettled(promises);
  }

  async onTaskCreated(task: ContentTask, creatorName: string): Promise<void> {
    const settings = await this.getSettings();
    if (!settings?.notifyOnTaskCreate) return;

    await this.notifyChannels({
      title: "New Task Created",
      message: `${creatorName} created a new task`,
      taskTitle: task.description || 'Untitled',
      assignee: task.assignedTo || undefined,
      dueDate: task.dueDate || undefined,
      priority: task.priority || undefined,
      status: task.status,
      link: `${this.baseUrl}/content`,
    });
  }

  async onTaskCompleted(task: ContentTask, completedBy: string): Promise<void> {
    const settings = await this.getSettings();
    if (!settings?.notifyOnTaskComplete) return;

    await this.notifyChannels({
      title: "Task Completed",
      message: `${completedBy} marked a task as completed`,
      taskTitle: task.description || 'Untitled',
      assignee: task.assignedTo || undefined,
      status: 'completed',
      link: `${this.baseUrl}/content`,
    });
  }

  async onTaskAssigned(task: ContentTask, assignee: string, assignedBy: string): Promise<void> {
    const settings = await this.getSettings();
    if (!settings?.notifyOnTaskAssign) return;

    await this.notifyChannels({
      title: "Task Assigned",
      message: `${assignedBy} assigned a task to ${assignee}`,
      taskTitle: task.description || 'Untitled',
      assignee: assignee,
      dueDate: task.dueDate || undefined,
      priority: task.priority || undefined,
      link: `${this.baseUrl}/content`,
    });
  }

  async onCommentAdded(task: ContentTask, commenterName: string, commentPreview: string): Promise<void> {
    const settings = await this.getSettings();
    if (!settings?.notifyOnComment) return;

    await this.notifyChannels({
      title: "New Comment",
      message: `${commenterName} commented: "${commentPreview.substring(0, 100)}${commentPreview.length > 100 ? '...' : ''}"`,
      taskTitle: task.description || 'Untitled',
      link: `${this.baseUrl}/content`,
    });
  }

  async onTaskDueSoon(task: ContentTask, daysUntilDue: number): Promise<void> {
    const settings = await this.getSettings();
    if (!settings?.notifyOnDueSoon) return;

    await this.notifyChannels({
      title: "Task Due Soon",
      message: `A task is due ${daysUntilDue === 1 ? 'tomorrow' : `in ${daysUntilDue} days`}`,
      taskTitle: task.description || 'Untitled',
      assignee: task.assignedTo || undefined,
      dueDate: task.dueDate || undefined,
      priority: task.priority || undefined,
      link: `${this.baseUrl}/content`,
    });
  }

  async onTaskOverdue(task: ContentTask, daysOverdue: number): Promise<void> {
    const settings = await this.getSettings();
    if (!settings?.notifyOnOverdue) return;

    await this.notifyChannels({
      title: "Task Overdue",
      message: `A task is ${daysOverdue} day${daysOverdue > 1 ? 's' : ''} overdue!`,
      taskTitle: task.description || 'Untitled',
      assignee: task.assignedTo || undefined,
      dueDate: task.dueDate || undefined,
      priority: task.priority || undefined,
      status: task.status,
      link: `${this.baseUrl}/content`,
    });
  }

  async testTelegramConnection(botToken: string, chatId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: '✅ *ContentFlowStudio Connected\\!*\n\nYour Telegram channel is now connected and will receive task notifications\\.',
          parse_mode: 'MarkdownV2',
        }),
      });

      if (!response.ok) {
        const data = await response.json() as { description?: string };
        return { success: false, error: data.description || 'Unknown error' };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  async testDiscordWebhook(webhookUrl: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          embeds: [{
            title: "ContentFlowStudio Connected!",
            description: "Your Discord channel is now connected and will receive task notifications.",
            color: 0x22C55E,
            timestamp: new Date().toISOString(),
            footer: { text: "ContentFlowStudio" }
          }]
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        return { success: false, error };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  // Payment Request Notifications
  async sendPaymentRequestNotification(
    eventType: "created" | "approved" | "rejected" | "cancelled",
    request: PaymentRequest,
    requesterName: string,
    reviewerName?: string
  ): Promise<void> {
    let title = "";
    let message = "";
    let color = 0x64748B;

    switch (eventType) {
      case "created":
        title = "💰 New Payment Request";
        message = `${requesterName} submitted a payment request for ${request.currency} ${request.amount}`;
        color = 0xF59E0B; // Amber
        break;
      case "approved":
        title = "✅ Payment Request Approved";
        message = `${reviewerName || 'An admin'} approved ${requesterName}'s payment request for ${request.currency} ${request.amount}`;
        if (request.adminNote) {
          message += `\nNote: ${request.adminNote}`;
        }
        color = 0x22C55E; // Green
        break;
      case "rejected":
        title = "❌ Payment Request Rejected";
        message = `${reviewerName || 'An admin'} rejected ${requesterName}'s payment request for ${request.currency} ${request.amount}`;
        if (request.adminNote) {
          message += `\nReason: ${request.adminNote}`;
        }
        color = 0xEF4444; // Red
        break;
      case "cancelled":
        title = "🚫 Payment Request Cancelled";
        message = `${requesterName} cancelled their payment request for ${request.currency} ${request.amount}`;
        color = 0x64748B; // Slate
        break;
    }

    // Send to Telegram
    await this.sendPaymentRequestToTelegram(title, message, request.reason);
    
    // Send to Discord
    await this.sendPaymentRequestToDiscord(title, message, request, color);
  }

  private async sendPaymentRequestToTelegram(title: string, message: string, reason: string): Promise<boolean> {
    const settings = await this.getSettings();
    if (!settings?.telegramEnabled || !settings.telegramBotToken || !settings.telegramChatId) {
      return false;
    }

    try {
      const url = `https://api.telegram.org/bot${settings.telegramBotToken}/sendMessage`;
      let telegramMsg = `*${this.escapeMarkdown(title)}*\n\n`;
      telegramMsg += `${this.escapeMarkdown(message)}\n\n`;
      telegramMsg += `📝 *Reason:* ${this.escapeMarkdown(reason)}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: settings.telegramChatId,
          text: telegramMsg,
          parse_mode: 'MarkdownV2',
        }),
      });

      return response.ok;
    } catch (error) {
      console.error('[Telegram] Failed to send payment notification:', error);
      return false;
    }
  }

  private async sendPaymentRequestToDiscord(title: string, message: string, request: PaymentRequest, color: number): Promise<boolean> {
    const settings = await this.getSettings();
    if (!settings?.discordEnabled || !settings.discordWebhookUrl) {
      return false;
    }

    try {
      const response = await fetch(settings.discordWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          embeds: [{
            title: title,
            description: message,
            color: color,
            fields: [
              { name: "Amount", value: `${request.currency} ${request.amount}`, inline: true },
              { name: "Reason", value: request.reason, inline: true },
              { name: "Status", value: request.status.toUpperCase(), inline: true },
            ],
            timestamp: new Date().toISOString(),
            footer: { text: "ContentFlowStudio Payment Requests" }
          }]
        }),
      });

      return response.ok;
    } catch (error) {
      console.error('[Discord] Failed to send payment notification:', error);
      return false;
    }
  }
}

export const channelNotificationService = new ChannelNotificationService();
