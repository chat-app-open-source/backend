import path from 'path';

import nodemailer from 'nodemailer';
import hbs from 'nodemailer-express-handlebars';

import { envConfig, logger } from '../config';

const transporter = nodemailer.createTransport({
  pool: true,
  host: String(envConfig.smtpHost),
  port: Number(envConfig.smtpPort),
  service: String(envConfig.smtpService),
  secure: false, // port 465 for true
  connectionTimeout: 10000,
  greetingTimeout: 5000,
  socketTimeout: 10000,
  auth: {
    user: String(envConfig.smtpUser),
    pass: String(envConfig.smtpPass),
  },
});

const handlebarOptions = {
  viewEngine: {
    extname: '.handlebars',
    partialsDir: path.resolve(__dirname, '../../src/views/partials'),
    layoutsDir: path.resolve(__dirname, '../../src/views/layouts'),
    defaultLayout: 'main',
  },
  viewPath: path.resolve(__dirname, '../../src/views'),
  extName: '.handlebars',
  defaultLayout: 'main',
};

// Configure Handlebars
transporter.use('compile', hbs(handlebarOptions));

interface MailOptions {
  to: string;
  subject: string;
  template: string;
  context: Record<string, unknown>;
}

export const sendEmail = async (options: MailOptions): Promise<void> => {
  try {
    if (envConfig.nodeEnv === 'dev') {
      logger.debug('SMTP Configuration', {
        host: envConfig.smtpHost,
        port: envConfig.smtpPort,
        user: envConfig.smtpUser,
        hasPassword: !!envConfig.smtpPass,
      });
    }

    const mailOptions = {
      from: `"${envConfig.fromName}" <${envConfig.fromEmail}>`,
      to: options.to,
      subject: options.subject,
      template: options.template,
      context: {
        ...options.context,
        cssPath: path.resolve(__dirname, '../../src/views/css/style.css'),
      },
    };

    logger.debug('Sending email', { to: options.to, template: options.template });

    const result = await transporter.sendMail(mailOptions);

    logger.info('Email sent successfully', {
      to: options.to,
      template: options.template,
      messageId: result.messageId,
      accepted: result.accepted,
      rejected: result.rejected,
    });
  } catch (error: unknown) {
    const err = error as Error;

    // Parse Gmail error details
    if (err.message.includes('535-5.7.8')) {
      logger.error('Gmail Authentication Failed', {
        error: 'Invalid username/password or App Password required',
        smtpUser: envConfig.smtpUser,
        solution:
          '1. Enable 2FA on Google Account\n2. Generate App Password\n3. Update SMTP_PASS in .env.dev',
      });
      throw new Error('Gmail authentication failed. Please check App Password configuration.');
    }

    if (err.message.includes('ECONNREFUSED')) {
      logger.error('SMTP Connection Failed', {
        error: 'Connection refused - check SMTP host/port',
        host: envConfig.smtpHost,
        port: envConfig.smtpPort,
        solution: 'Verify SMTP settings in .env.dev',
      });
      throw new Error('SMTP connection failed. Please check email configuration.');
    }

    logger.error('Email sending failed', {
      error: err.message,
      code: err.message.split(' ')[0],
      to: options.to,
      template: options.template,
      stack: err.stack,
    });
    throw new Error(`Failed to send email: ${err.message}`);
  }
};

// Test email connection with detailed logging
export const testEmailConnection = async (): Promise<boolean> => {
  try {
    logger.info('Testing email connection...', {
      host: envConfig.smtpHost,
      port: envConfig.smtpPort,
      user: envConfig.smtpUser,
    });

    const result = await transporter.verify();

    logger.info('Email connection test successful', {
      host: envConfig.smtpHost,
      user: envConfig.smtpUser,
      authenticated: result,
    });

    return true;
  } catch (error: unknown) {
    const err = error as Error;

    logger.error('Email connection test failed', {
      error: err.message,
      host: envConfig.smtpHost,
      port: envConfig.smtpPort,
      user: envConfig.smtpUser,
      stack: err.stack,
    });

    // Specific error handling
    if (err.message.includes('535')) {
      logger.error('Authentication Error Details', {
        solution: 'Enable 2FA → Generate App Password → Update .env.dev',
        gmailHelp: 'https://support.google.com/mail/?p=BadCredentials',
      });
    }

    return false;
  }
};
