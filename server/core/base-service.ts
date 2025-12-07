import type { Router } from 'express';

/**
 * BaseService - Abstract class for all microservices
 * 
 * All services must extend this class and implement required methods.
 * This ensures consistent interface across all services.
 */
export abstract class BaseService {
  protected serviceName: string;

  constructor(serviceName: string) {
    this.serviceName = serviceName;
  }

  /**
   * Get the Express router for this service
   * @returns Express Router with all service endpoints
   */
  abstract getRoutes(): Router;

  /**
   * Initialize the service (database connections, external services, etc.)
   * Called once when the service is registered
   */
  abstract initialize(): Promise<void>;

  /**
   * Health check endpoint to verify service is operational
   * @returns boolean indicating service health
   */
  abstract healthCheck(): Promise<boolean>;

  /**
   * Get service name
   */
  getName(): string {
    return this.serviceName;
  }

  /**
   * Get service info for debugging/monitoring
   */
  getInfo() {
    return {
      name: this.serviceName,
      status: 'active',
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Service Registry - Manages all registered services
 */
export class ServiceRegistry {
  private services: Map<string, BaseService> = new Map();

  /**
   * Register a service
   */
  register(service: BaseService): void {
    this.services.set(service.getName(), service);
  }

  /**
   * Get a service by name
   */
  get(name: string): BaseService | undefined {
    return this.services.get(name);
  }

  /**
   * Get all registered services
   */
  getAll(): BaseService[] {
    return Array.from(this.services.values());
  }

  /**
   * Initialize all services
   */
  async initializeAll(): Promise<void> {
    for (const service of this.services.values()) {
      await service.initialize();
    }
  }

  /**
   * Health check all services
   */
  async healthCheckAll(): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};
    
    for (const service of this.services.values()) {
      try {
        results[service.getName()] = await service.healthCheck();
      } catch (error) {
        results[service.getName()] = false;
      }
    }
    
    return results;
  }
}
