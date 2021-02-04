import transporter from '../transporter'

export default function(senderEmail){

const mailOptions = {
    from: 'Live Chat',
    to: "muhammedfatihakyol@gmail.com",
    subject: 'Contact Request',
    text: `Activation Code: ${activationCode}`,
  };

  transporter.sendMail(mailOptions).then(info => console.log('Sent a register e-mail.'));
}