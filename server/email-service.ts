import nodemailer from "nodemailer";
import type { ContentTask, User } from "@shared/schema";

interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  from: string;
}

export class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private fromAddress: string = "";
  private isConfigured: boolean = false;

  async initialize(): Promise<boolean> {
    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT || "587");
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const from = process.env.SMTP_FROM || user;

    if (!host || !user || !pass) {
      console.log("Email service not configured - missing SMTP credentials");
      return false;
    }

    try {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: {
          user,
          pass,
        },
      });

      await this.transporter.verify();
      this.fromAddress = from || user;
      this.isConfigured = true;
      console.log("Email service initialized successfully");
      return true;
    } catch (error) {
      console.error("Failed to initialize email service:", error);
      this.isConfigured = false;
      return false;
    }
  }

  isReady(): boolean {
    return this.isConfigured && this.transporter !== null;
  }

  async sendTaskAssignmentEmail(
    task: ContentTask,
    assignee: User,
    assignedBy: string
  ): Promise<boolean> {
    if (!this.isReady()) {
      console.log("Email service not configured, skipping email notification");
      return false;
    }

    const subject = `New Task Assigned: ${task.description?.substring(0, 50)}...`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #3B82F6;">New Task Assigned to You</h2>
        <p>Hi ${assignee.firstName || "there"},</p>
        <p>You have been assigned a new task by ${assignedBy}.</p>
        
        <div style="background: #F3F4F6; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <h3 style="margin: 0 0 8px 0; color: #1F2937;">${task.description}</h3>
          <p style="margin: 4px 0; color: #6B7280;"><strong>Status:</strong> ${task.status}</p>
          ${task.dueDate ? `<p style="margin: 4px 0; color: #6B7280;"><strong>Due Date:</strong> ${task.dueDate}</p>` : ""}
          ${task.priority ? `<p style="margin: 4px 0; color: #6B7280;"><strong>Priority:</strong> ${task.priority}</p>` : ""}
          ${task.client ? `<p style="margin: 4px 0; color: #6B7280;"><strong>Client:</strong> ${task.client}</p>` : ""}
        </div>
        
        <p style="color: #6B7280; font-size: 14px;">Log in to the Content Tracker to view the full task details.</p>
      </div>
    `;

    return this.sendEmail(assignee.email, subject, html);
  }

  async sendDueSoonEmail(
    task: ContentTask,
    assignee: User,
    daysUntilDue: number
  ): Promise<boolean> {
    if (!this.isReady()) {
      return false;
    }

    const subject = `Task Due Soon: ${task.description?.substring(0, 50)}...`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #F59E0B;">Task Due Soon</h2>
        <p>Hi ${assignee.firstName || "there"},</p>
        <p>This is a reminder that you have a task due ${daysUntilDue === 1 ? "tomorrow" : `in ${daysUntilDue} days`}.</p>
        
        <div style="background: #FEF3C7; border-radius: 8px; padding: 16px; margin: 16px 0; border-left: 4px solid #F59E0B;">
          <h3 style="margin: 0 0 8px 0; color: #1F2937;">${task.description}</h3>
          <p style="margin: 4px 0; color: #6B7280;"><strong>Due Date:</strong> ${task.dueDate}</p>
          <p style="margin: 4px 0; color: #6B7280;"><strong>Status:</strong> ${task.status}</p>
          ${task.client ? `<p style="margin: 4px 0; color: #6B7280;"><strong>Client:</strong> ${task.client}</p>` : ""}
        </div>
        
        <p style="color: #6B7280; font-size: 14px;">Log in to the Content Tracker to update or complete this task.</p>
      </div>
    `;

    return this.sendEmail(assignee.email, subject, html);
  }

  async sendOverdueEmail(
    task: ContentTask,
    assignee: User,
    daysOverdue: number
  ): Promise<boolean> {
    if (!this.isReady()) {
      return false;
    }

    const subject = `OVERDUE Task: ${task.description?.substring(0, 50)}...`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #EF4444;">Task is Overdue</h2>
        <p>Hi ${assignee.firstName || "there"},</p>
        <p>This is an urgent reminder that you have a task that is ${daysOverdue === 1 ? "1 day" : `${daysOverdue} days`} overdue.</p>
        
        <div style="background: #FEE2E2; border-radius: 8px; padding: 16px; margin: 16px 0; border-left: 4px solid #EF4444;">
          <h3 style="margin: 0 0 8px 0; color: #1F2937;">${task.description}</h3>
          <p style="margin: 4px 0; color: #6B7280;"><strong>Due Date:</strong> ${task.dueDate}</p>
          <p style="margin: 4px 0; color: #6B7280;"><strong>Status:</strong> ${task.status}</p>
          ${task.client ? `<p style="margin: 4px 0; color: #6B7280;"><strong>Client:</strong> ${task.client}</p>` : ""}
        </div>
        
        <p style="color: #6B7280; font-size: 14px;">Please update or complete this task as soon as possible.</p>
      </div>
    `;

    return this.sendEmail(assignee.email, subject, html);
  }

  async sendCommentNotificationEmail(
    task: ContentTask,
    recipient: User,
    commenterName: string,
    commentContent: string
  ): Promise<boolean> {
    if (!this.isReady()) {
      return false;
    }

    const subject = `New Comment on Task: ${task.description?.substring(0, 40)}...`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #3B82F6;">New Comment on Your Task</h2>
        <p>Hi ${recipient.firstName || "there"},</p>
        <p><strong>${commenterName}</strong> commented on a task you're assigned to:</p>
        
        <div style="background: #F3F4F6; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <p style="margin: 0 0 12px 0; font-style: italic; color: #4B5563;">"${commentContent}"</p>
          <p style="margin: 0; color: #6B7280; font-size: 14px;"><strong>Task:</strong> ${task.description}</p>
        </div>
        
        <p style="color: #6B7280; font-size: 14px;">Log in to the Content Tracker to view and reply to this comment.</p>
      </div>
    `;

    return this.sendEmail(recipient.email, subject, html);
  }

  private async sendEmail(
    to: string,
    subject: string,
    html: string
  ): Promise<boolean> {
    if (!this.transporter) {
      return false;
    }

    try {
      await this.transporter.sendMail({
        from: this.fromAddress,
        to,
        subject,
        html,
      });
      console.log(`Email sent to ${to}: ${subject}`);
      return true;
    } catch (error) {
      console.error(`Failed to send email to ${to}:`, error);
      return false;
    }
  }
}

export const emailService = new EmailService();
