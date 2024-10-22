import { redis } from '@/lib/redis';

export async function GET() {
    const subscriber = redis.duplicate();
    await subscriber.subscribe('file-events');

    const stream = new ReadableStream({
        start(controller) {
            subscriber.on('message', (channel, message) => {
                controller.enqueue(`data: ${message}\n\n`);
            });
        },
        cancel() {
            subscriber.unsubscribe();
            subscriber.quit();
        },
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
        },
    });
}

export const dynamic = 'force-dynamic';