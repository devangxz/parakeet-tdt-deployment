import { redis } from '@/lib/redis';

export async function GET() {
    const subscriber = redis.duplicate();

    try {
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
    } catch (error) {
        subscriber.quit();
        return new Response('Error establishing SSE connection', { status: 500 });
    }
}

export const dynamic = 'force-dynamic';