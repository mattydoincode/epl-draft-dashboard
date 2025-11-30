import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');

export async function POST() {
  try {
    console.log('[Backend] Clearing cache...');
    
    if (!fs.existsSync(DATA_DIR)) {
      return NextResponse.json({
        message: 'No cache to clear',
        filesDeleted: 0,
      });
    }

    const files = fs.readdirSync(DATA_DIR);
    let deletedCount = 0;
    const deletedFiles: string[] = [];

    for (const file of files) {
      if (file.endsWith('.json')) {
        const filePath = path.join(DATA_DIR, file);
        fs.unlinkSync(filePath);
        deletedFiles.push(file);
        deletedCount++;
        console.log(`[Backend] Deleted: ${file}`);
      }
    }

    console.log(`[Backend] Cache cleared: ${deletedCount} files deleted`);

    return NextResponse.json({
      message: `Cache cleared successfully`,
      filesDeleted: deletedCount,
      files: deletedFiles,
    });
  } catch (error) {
    console.error('[Backend] Error clearing cache:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

