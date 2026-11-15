import nodemailer from 'nodemailer';

export function createAuthMailer(env = process.env) {
  const ready = Boolean(env.SMTP_HOST && env.SMTP_FROM);
  const port = Number(env.SMTP_PORT || 587);
  const secure = port === 465;
  const transport = ready ? nodemailer.createTransport({
    host: env.SMTP_HOST, port, secure,
    requireTLS: !secure && env.SMTP_ALLOW_INSECURE !== 'true',
    auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASSWORD } : undefined,
    connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 15000,
    logger: false, debug: false,
  }) : null;
  if (env.NODE_ENV === 'production' && env.SMTP_ALLOW_INSECURE === 'true') {
    throw new Error('Unverschlüsseltes SMTP ist nur für die lokale Entwicklung erlaubt.');
  }
  return {
    ready,
    async send({ email, kind, token, origin }) {
      if (!transport) throw new Error('SMTP ist nicht eingerichtet.');
      const verify = kind === 'verify';
      const setup = kind === 'setup';
      // Fragment tokens do not enter server/proxy access logs or referrer headers.
      const link = `${origin}/anmelden.html#${verify ? 'bestaetigen' : setup ? 'erstes-passwort' : 'zuruecksetzen'}=${token}`;
      await transport.sendMail({
        from: env.SMTP_FROM, to: { address: email, name: '' },
        subject: verify ? 'OBD2 Klartext – E-Mail-Adresse bestätigen' : setup ? 'OBD2 Klartext – Deine erste Anmeldung' : 'OBD2 Klartext – Passwort zurücksetzen',
        text: verify
          ? `Du hast ein Konto bei OBD2 Klartext angefragt.\n\nBestätige deine E-Mail-Adresse:\n${link}\n\nDer Link gilt 24 Stunden und kann nur einmal verwendet werden. Erst nach deiner Bestätigung wird das Konto freigeschaltet. Dein Passwort legst du anschließend bei deiner ersten Anmeldung fest. Wenn du kein Konto angefragt hast, ignoriere diese Nachricht.\n`
          : setup ? `Deine E-Mail-Adresse bei OBD2 Klartext ist bereits bestätigt.\n\nLege bei deiner ersten Anmeldung dein persönliches Passwort fest:\n${link}\n\nDer Link gilt 30 Minuten und kann nur einmal verwendet werden. Wenn du dies nicht angefragt hast, ignoriere diese Nachricht.\n`
          : `Du hast ein neues Passwort für OBD2 Klartext angefragt.\n\nLege dein neues Passwort fest:\n${link}\n\nDer Link gilt 30 Minuten und kann nur einmal verwendet werden. Wenn du dies nicht angefragt hast, ignoriere diese Nachricht. Dein Passwort bleibt dann unverändert.\n`,
        disableFileAccess: true, disableUrlAccess: true,
      });
    },
  };
}
