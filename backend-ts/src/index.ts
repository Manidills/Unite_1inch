import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import routes from './routes'
import { config } from './config/index'

dotenv.config();
const app = express();

app.use(cors())
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api', routes);

app.listen(config.port, () => {
  console.log(`Backend running on http://localhost:${config.port}`);
});
