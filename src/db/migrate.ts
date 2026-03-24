import { pool } from './client'

async function migrate() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS courses (
            course_number VARCHAR(10) PRIMARY KEY,
            name          TEXT        NOT NULL,
            updated_at    TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS grade_snapshots (
            id                SERIAL PRIMARY KEY,
            course_number     VARCHAR(10) NOT NULL REFERENCES courses(course_number) ON DELETE CASCADE,
            semester          TEXT        NOT NULL,
            average           NUMERIC(4,2),
            pass_percentage   NUMERIC(5,2),
            participants      INTEGER,
            distribution      JSONB       NOT NULL,
            UNIQUE (course_number, semester)
        );

        CREATE INDEX IF NOT EXISTS idx_snapshots_course ON grade_snapshots(course_number);
    `)
    console.log('Migration complete.')
    await pool.end()
}

migrate().catch((err) => {
    console.error('Migration failed:', err)
    process.exit(1)
})
