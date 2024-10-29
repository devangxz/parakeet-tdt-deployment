import logger from '@/lib/logger';
import { redis } from '@/lib/redis';

const HEARTBEAT_INTERVAL = 30000;
const CONNECTION_TIMEOUT = 2 * 60 * 1000;

export async function GET() {
    const subscriber = redis.duplicate();
    let heartbeatInterval: NodeJS.Timeout;
    let connectionTimeout: NodeJS.Timeout;

    const stream = new ReadableStream({
        async start(controller) {
            try {
                await subscriber.subscribe('file-events');

                subscriber.on('message', (channel, message) => {
                    controller.enqueue(`data: ${message}\n\n`);
                });

                heartbeatInterval = setInterval(() => {
                    controller.enqueue(': heartbeat\n\n');
                }, HEARTBEAT_INTERVAL);

                connectionTimeout = setTimeout(() => {
                    cleanup();
                    controller.close();
                }, CONNECTION_TIMEOUT);

            } catch (error) {
                logger.error(`Error in SSE stream: ${error}`);
                cleanup();
                controller.error(error);
            }
        },
        cancel() {
            cleanup();
        }
    });

    function cleanup() {
        clearInterval(heartbeatInterval);
        clearTimeout(connectionTimeout);
        subscriber.unsubscribe().catch(console.error);
        subscriber.quit().catch(console.error);
    }

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-transform',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no'
        },
    });
}

export const dynamic = 'force-dynamic';