import nodemailer from 'nodemailer'
import type Mail from 'nodemailer/lib/mailer'

const getRequiredEnvVariable = (key: string): string => {
  const value = process.env[key]
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`)
  }
  return value
}

let transporter: Mail | null = null

const createGmailTransporter = (): Mail => {
  if (transporter) {
    return transporter
  }

  const gmailUser = getRequiredEnvVariable('GMAIL_USER')
  const gmailPassword = getRequiredEnvVariable('GMAIL_PASSWORD')

  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: gmailUser,
      pass: gmailPassword,
    },
  })

  return transporter
}

export const sendEmail = async (to: string, subject: string, html: string): Promise<void> => {
  try {
    const transport = createGmailTransporter()
    const gmailUser = getRequiredEnvVariable('GMAIL_USER')

    const mailOptions = {
      from: gmailUser,
      to,
      subject,
      html,
    }

    await transport.sendMail(mailOptions)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(`Failed to send email via Gmail: ${errorMessage}`)
  }
}
