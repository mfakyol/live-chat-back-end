import nodemailer from 'nodemailer';

export default nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'muhammedfatihakyol60@gmail.com',
        pass: '135792468*-+'
    }
})