import 'dotenv/config';
import express from "express";
import dmthreadsRouter from "./routes/dmthreads.js";

const app = express();
app.use(express.json());

/****************************************************************************
 * feat/direct-messaging testing area Start
 ****************************************************************************/

app.use("/dmthreads", dmthreadsRouter);




/****************************************************************************
 * feat/direct-messaging testing area End
 ****************************************************************************/

app.listen(3000, () => {
    console.log("Server running on http://localhost:3000");
});