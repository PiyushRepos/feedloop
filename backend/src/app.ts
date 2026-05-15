import express, { type Application } from 'express';
import cors from 'cors';

function createApp(): Application {
  const app = express();

  app.use(cors());

  app.get('/', (req, res) => {
    return res.status(200).json({ message: 'Welcome to FeedLoop API!' });
  });

  return app;
}

export default createApp;
