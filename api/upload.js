import multer from "multer";
import cors from "cors";
import { Uploader } from "@0glabs/0g-ts-sdk";

const upload = multer();

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {

  cors()(req, res, async () => {

    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    upload.single("file")(req, res, async (err) => {
      if (err) {
        return res.status(500).json({ error: "Upload error" });
      }

      try {

        const uploader = new Uploader("https://storage-testnet.0g.ai");

        const result = await uploader.upload(req.file.buffer);

        res.status(200).json({
          uri: result.url
        });

      } catch (e) {
        console.error(e);
        res.status(500).json({ error: "0G upload failed" });
      }

    });

  });
}