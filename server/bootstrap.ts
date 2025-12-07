import { ServiceRegistry } from './core/base-service';
import { createApiGateway } from './core/api-gateway';
import { web3Service } from './services/web3-service';
import { emailServiceAPI } from './services/email-service';
import { storageServiceAPI } from './services/storage-service';
import logger from './core/logger';
import type { Express } from 'express';

/**
 * Bootstrap the microservices architecture
 * 
 * This file initializes the ServiceRegistry, registers all services,
 * and sets up the API Gateway for routing.
 * 
 * Migration Strategy:
 * - New endpoints use the microservices architecture (via API Gateway)
 * - Legacy endpoints remain in routes.ts during migration
 * - Gradual migration of endpoints from monolith to services
 */

/**
 * Initialize and register all services
 */
export async function bootstrapServices(app: Express): Promise<void> {
  logger.info('🚀 Bootstrapping microservices architecture...');

  try {
    // Create service registry
    const registry = new ServiceRegistry();

    // Register all services
    logger.info('📝 Registering services...');
    
    // Register Web3 Service
    registry.register(web3Service);
    logger.info('✅ Registered Web3 Service');

    // Register Email Service
    registry.register(emailServiceAPI);
    logger.info('✅ Registered Email Service');

    // Register Storage Service
    registry.register(storageServiceAPI);
    logger.info('✅ Registered Storage Service');

    // TODO: Add more services as they are migrated:
    // registry.register(googleDriveService);
    // registry.register(googleSheetsService);
    // registry.register(discordService);
    // registry.register(safeService);
    // etc.

    // Create and configure API Gateway
    const gateway = createApiGateway(registry);

    // Initialize all services (connect to external services, validate config, etc.)
    await gateway.initializeServices();

    // Register all service routes with Express
    gateway.registerRoutes(app);

    logger.info('✅ Microservices architecture bootstrapped successfully');
    logger.info(`📊 Total services registered: ${registry.getAll().length}`);
  } catch (error) {
    logger.error('❌ Failed to bootstrap microservices', { error });
    throw error;
  }
}

/**
 * Get service information for debugging
 */
export function getServicesInfo(): string[] {
  const registry = new ServiceRegistry();
  registry.register(web3Service);
  registry.register(emailServiceAPI);
  registry.register(storageServiceAPI);
  
  return registry.getAll().map(service => {
    const info = service.getInfo();
    return `${info.name} - Status: ${info.status} (Last checked: ${info.timestamp})`;
  });
}
