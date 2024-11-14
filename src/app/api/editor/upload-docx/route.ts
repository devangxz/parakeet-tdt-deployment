import { FileTag, OrderStatus } from '@prisma/client';
import { NextResponse } from 'next/server';

import logger from '@/lib/logger';
import prisma from '@/lib/prisma';
import { deleteFileVersionFromS3, uploadToS3 } from '@/utils/backend-helper';

export async function POST(req: Request) {
  try {
    const userToken = req.headers.get('x-user-token');
    const user = JSON.parse(userToken ?? '{}');
    const transcriberId = user?.userId;
    const fileId = new URL(req.url).searchParams.get('fileId');
    const filename = `${fileId}.docx`;

    if (!fileId) {
      return NextResponse.json({ error: 'File ID is required' }, { status: 400 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const order = await prisma.order.findUnique({
      where: {
        fileId: fileId,
      },
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();

    const { VersionId } = await uploadToS3(filename, Buffer.from(buffer), 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');

    let tag: FileTag = FileTag.CF_REV_SUBMITTED;

    if (order?.status === OrderStatus.FINALIZER_ASSIGNED) {
      tag = FileTag.CF_FINALIZER_SUBMITTED;
    }

    if (order?.status === OrderStatus.PRE_DELIVERED) {
      tag = FileTag.CF_OM_DELIVERED;
    }

    const fileVersion = await prisma.fileVersion.findFirst({
      where: {
        userId: transcriberId,
        fileId,
        tag
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });

    if (!fileVersion || !fileVersion.s3VersionId) {
      await prisma.fileVersion.create({
        data: {
          userId: transcriberId,
          fileId,
          tag,
          s3VersionId: VersionId,
        }
      })
    } else {
      await deleteFileVersionFromS3(filename, fileVersion.s3VersionId);

      await prisma.fileVersion.update({
        where: { id: fileVersion.id },
        data: {
          s3VersionId: VersionId
        }
      })
    }

    if (tag === FileTag.CF_OM_DELIVERED) {
      await prisma.fileVersion.updateMany({
        where: {
          fileId,
          tag: FileTag.CF_CUSTOMER_DELIVERED,
          userId: order.userId
        },
        data: {
          s3VersionId: VersionId
        }
      })
    }

    return NextResponse.json({ message: 'File uploaded successfully' }, { status: 200 });
  } catch (error) {
    logger.error(`Error uploading docx file: ${error}.`);
    return NextResponse.json({ error: 'Error uploading file' }, { status: 500 });
  }
}