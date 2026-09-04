import { app } from './app.js';
import { config } from './config.js';

app.listen(
  config.PORT,
  () => {
    console.log(
      `API running on port ${config.PORT}`
    );
  }
);