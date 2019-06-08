import "reflect-metadata";
import {createConnection} from "typeorm";

import { createApp } from './express-app'

createConnection().then((conn) => {
  createApp(conn).listen(3000)
})
