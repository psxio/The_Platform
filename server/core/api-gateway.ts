import type { Express, Request, Response, NextFunction } from 'express';
import { ServiceRegistry } from './base-service';
import logger, { logRequest, logResponse } from './logger';

/**
 * API Gateway - Routes requests to appropriate microservices
 * 
 * Responsibilities:
 * - Route requests to registered services
 * - Log all requests and responses
 * - Track response times
 * - Provide service health checks
 * - Service discovery
 */
export class ApiGateway {
  private registry: ServiceRegistry;

  constructor(registry: ServiceRegistry) {
    this.registry = registry;
  }

  /**
   * Register all service routes with the Express app
   */
  registerRoutes(app: Express): void {
    logger.info('🚀 Registering service routes...');

    // Add request logging middleware
    app.use(this.requestLogger);

    // Register each service's routes
    const services = this.registry.getAll();
    
    for (const service of services) {
      const routes = service.getRoutes();
      const serviceName = service.getName();
      const mountPath = `/api/${serviceName}`;
      
      app.use(mountPath, routes);
      logger.info(`✅ Registered service: ${serviceName} at ${mountPath}`);
    }

    // Add global health check endpoint
    app.get('/api/health', this.healthCheck.bind(this));
    app.get('/api/services', this.listServices.bind(this));
    
    logger.info('✅ All services registered successfully');
  }

  /**
   * Request logging middleware
   * Logs all incoming requests and tracks response time
   */
  private requestLogger(req: Request, res: Response, next: NextFunction): void {
    const startTime = Date.now();

    // Log the request
    logRequest(req);

    // Capture response finish event
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      logResponse(req, res, duration);
    });

    next();
  }

  /**
   * Health check endpoint
   * Returns health status of all services
   */
  private async healthCheck(req: Request, res: Response): Promise<void> {
    try {
      const health = await this.registry.healthCheckAll();
      
      // Check if all services are healthy
      const allHealthy = Object.values(health).every(status => status === true);
      const statusCode = allHealthy ? 200 : 503;

      res.status(statusCode).json({
        status: allHealthy ? 'healthy' : 'degraded',
        timestamp: new Date().toISOString(),
        services: health,
      });
    } catch (error) {
      logger.error('Health check failed', { error });
      res.status(500).json({
        status: 'error',
        message: 'Health check failed',
      });
    }
  }

  /**
   * List all registered services
   * Returns service information for discovery
   */
  private listServices(req: Request, res: Response): void {
    const services = this.registry.getAll().map(service => ({
      name: service.getName(),
      path: `/api/${service.getName()}`,
      info: service.getInfo(),
    }));

    res.json({
      count: services.length,
      services,
    });
  }

  /**
   * Initialize all services
   */
  async initializeServices(): Promise<void> {
    logger.info('🔧 Initializing services...');
    await this.registry.initializeAll();
    logger.info('✅ All services initialized');
  }
}

/**
 * Create and configure API Gateway
 */
export function createApiGateway(registry: ServiceRegistry): ApiGateway {
  return new ApiGateway(registry);
}
