
const { PrismaClient } = require('@prisma/client');

async function migrateAuthorField() {
    const prisma = new PrismaClient();

    try {
        // Get the first user to assign as default author for existing reports
        const firstUser = await prisma.user.findFirst({
            select: { id: true }
        });

        if (!firstUser) {
            console.error('No users found in database. Cannot migrate.');
            process.exit(1);
        }

        console.log(`Found default author: ${firstUser.id}`);

        // Add author_id column with default value
        await prisma.$executeRawUnsafe(`
      ALTER TABLE research_reports 
      ADD COLUMN IF NOT EXISTS author_id UUID;
    `);

        // Update existing reports with default author
        await prisma.$executeRawUnsafe(`
      UPDATE research_reports 
      SET author_id = '${firstUser.id}'::uuid 
      WHERE author_id IS NULL;
    `);

        // Add NOT NULL constraint
        await prisma.$executeRawUnsafe(`
      ALTER TABLE research_reports 
      ALTER COLUMN author_id SET NOT NULL;
    `);

        // Add foreign key constraint if not exists
        await prisma.$executeRawUnsafe(`
      ALTER TABLE research_reports 
      DROP CONSTRAINT IF EXISTS research_reports_author_id_fkey;
    `);

        await prisma.$executeRawUnsafe(`
      ALTER TABLE research_reports 
      ADD CONSTRAINT research_reports_author_id_fkey 
      FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE;
    `);

        console.log('Migration completed successfully!');
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

migrateAuthorField();
