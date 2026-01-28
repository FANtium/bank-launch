const surfpoolPort = 8899;
const surfpoolURL = `http://localhost:${surfpoolPort}`;

/**
 * JSON-RPC 2.0 response types for surfpool RPC calls.
 */
interface JsonRpcResponse<T = unknown> {
	jsonrpc: '2.0';
	id: number | string;
	result?: T;
	error?: {
		code: number;
		message: string;
		data?: unknown;
	};
}

interface RpcCallOptions {
	/** Request timeout in milliseconds (default: 10000) */
	timeout?: number;
}

/**
 * Make a JSON-RPC 2.0 call to the surfpool validator.
 *
 * @param method - The RPC method to call (e.g., 'surfnet_resetNetwork')
 * @param params - Optional parameters to pass to the method
 * @param options - Optional configuration (timeout, etc.)
 * @returns The RPC response result
 * @throws Error if the request fails or returns an RPC error
 */
export default async function surfpoolRpcCall<T = unknown>(
	method: string,
	params: unknown = [],
	options: RpcCallOptions = {},
): Promise<T> {
	const { timeout = 10_000 } = options;

	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), timeout);

	try {
		const response = await fetch(surfpoolURL, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				jsonrpc: '2.0',
				id: crypto.randomUUID(),
				method,
				params,
			}),
			signal: controller.signal,
		});

		if (!response.ok) {
			throw new Error(`HTTP error: ${response.status} ${response.statusText}`);
		}

		const json = (await response.json()) as JsonRpcResponse<T>;

		if (json.error) {
			throw new Error(`RPC error ${json.error.code}: ${json.error.message}`);
		}

		return json.result as T;
	} catch (error) {
		if (error instanceof Error && error.name === 'AbortError') {
			throw new Error(`RPC call to '${method}' timed out after ${timeout}ms`);
		}
		throw error;
	} finally {
		clearTimeout(timeoutId);
	}
}
