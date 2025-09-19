# Changelog

All notable changes to E-RAPOT NUURUSH SHOLAAH will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2024-01-20

### Added
- Initial release of E-RAPOT NUURUSH SHOLAAH
- Complete student management system (CRUD operations)
- Teacher management with signature upload functionality
- Class and subject management
- Comprehensive assessment system for exam scores and memorization
- Dashboard with analytics and statistics
- Report card generation and printing system
- Excel import/export functionality
- Supabase authentication integration
- Responsive design with Tailwind CSS
- PostgreSQL database with Prisma ORM
- File upload system for teacher signatures
- Cascading filters for hierarchical data selection
- Real-time data updates with SWR
- Print-friendly report card layouts

### Technical Features
- Next.js 14 with App Router
- TypeScript for type safety
- Prisma ORM for database operations
- Supabase for authentication and database
- shadcn/ui component library
- Recharts for data visualization
- ExcelJS for spreadsheet operations
- Responsive mobile-first design

### Database Schema
- Students (siswa) table with personal information
- Teachers (guru) table with signature management
- Classes (kelas) and grade levels (tingkatan)
- Subjects (mata_pelajaran) management
- Exam scores (nilai_ujian) with automatic grading
- Memorization scores (nilai_hafalan)
- Attendance tracking (kehadiran)
- Behavior assessment (penilaian_sikap)
- Academic periods (periode_ajaran) management

### API Endpoints
- RESTful API for all CRUD operations
- Dashboard statistics endpoint
- Report generation API
- File upload endpoints
- Excel export/import APIs
- Authentication middleware

### Documentation
- Comprehensive README with setup instructions
- API documentation with examples
- Deployment guide for Vercel
- Contributing guidelines
- Database schema documentation

## [Unreleased]

### Planned Features
- PDF export for report cards
- Email notifications for parents
- Mobile app companion
- Advanced analytics and reporting
- Bulk data import improvements
- Multi-language support (Indonesian/Arabic)
- Parent portal access
- SMS integration for notifications

---

For more details about each release, see the [GitHub Releases](https://github.com/your-repo/releases) page.
