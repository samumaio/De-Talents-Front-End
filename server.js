import express from 'express';
import bodyParser from 'body-parser';
import { create } from 'ipfs-http-client';
const app = express();
const ipfs = create({ url: 'http://localhost:5001' });
app.use(bodyParser.json());

app.post('/pin', async (req, res) => {
    const { data } = req.body;
    try {
        const result = await ipfs.add(data);
        const cid = result.path;

        await ipfs.pin.add(cid);

        res.json({ cid });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
