import z from 'zod';

const Cluster = z.enum(['local', 'devnet', 'mainnet']);
type Cluster = z.infer<typeof Cluster>;

export default Cluster;
