import nodemailer from 'nodemailer';
import { getConfig } from './configuracaoService.js';

let transporter = null;

async function getTransporter() {
  const config = await getConfig();
  if (!config.smtp_host || !config.smtp_user) {
    throw new Error('SMTP não configurado. Configure em Configurações do Sistema.');
  }
  transporter = nodemailer.createTransport({
    host: config.smtp_host,
    port: config.smtp_port || 587,
    secure: config.smtp_secure || false,
    auth: {
      user: config.smtp_user,
      pass: config.smtp_pass,
    },
  });
  return transporter;
}

export async function enviarSenhaPorEmail(email, nome, senha) {
  const config = await getConfig();
  if (!config.smtp_host || !config.smtp_user) {
    throw new Error('SMTP não configurado. Configure em Configurações do Sistema.');
  }

  const transport = await getTransporter();
  const from = config.smtp_from || config.smtp_user;

  await transport.sendMail({
    from,
    to: email,
    subject: 'SSW Transportes - Acesso ao Sistema',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #f0c040; border-bottom: 2px solid #f0c040; padding-bottom: 10px;">
          SSW TRANSPORTES
        </h2>
        <p>Olá <strong>${nome}</strong>,</p>
        <p>Seu acesso ao sistema foi configurado. Utilize as credenciais abaixo para fazer login:</p>
        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 5px 0;"><strong>E-mail:</strong> ${email}</p>
          <p style="margin: 5px 0;"><strong>Senha:</strong> ${senha}</p>
        </div>
        <p style="color: #666; font-size: 12px;">
          Recomendamos alterar sua senha após o primeiro acesso.
        </p>
        <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;" />
        <p style="color: #999; font-size: 11px;">
          Este é um e-mail automático. Não responda.
        </p>
      </div>
    `,
  });
}
