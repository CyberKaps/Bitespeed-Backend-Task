import express from "express";
import identifyRouter from "./routes/identify";

const app = express();
app.use(express.json());


app.use("/identify", identifyRouter);

app.get("/", (_, res) => {
  res.send("Bitespeed Identity Service");
});

app.listen(3000, () => {
  console.log("Server running on port 3000");
});