# MSAJCE Question Paper Management System

An AI-powered Question Paper Management System developed for Mohamed Sathak AJ College of Engineering (MSAJCE). The system helps manage question banks, extract questions from PDFs, and generate structured Internal Assessment and End Semester Examination question papers.

## Overview

The MSAJCE Question Paper Management System is designed to simplify and digitize the examination question paper preparation process. It combines AI-powered PDF extraction, centralized question bank management, exam pattern configuration, and automated question paper generation.

The system supports role-based access for Exam Cell, Super Admin, and Principal workflows, including controlled requests for additional question paper sets.

## Key Features

### AI-Powered Question Bank Import
- Upload question bank PDFs.
- Extract questions using the Gemini API.
- Identify units, question parts, marks, and available academic metadata.
- Review and verify extracted questions before saving.
- Store question bank records and questions in Supabase.

### Question Bank Management
- Organize question banks by academic year, department, and subject.
- Browse and manage extracted questions.
- Maintain question metadata and usage history.

### Question Paper Generation
- Generate Internal Assessment question papers (IAT).
- Generate End Semester Examination question papers.
- Apply configured exam patterns and syllabus coverage.
- Generate question paper sets with controlled set limits.
- Track question usage after papers are finalized.

### Role-Based Access
- **Exam Cell:** Manage question banks and generate examination papers.
- **Super Admin:** Manage academic years, departments, subjects, and system-level data.
- **Principal:** Review and approve requests for additional paper sets.

### Audit Logs
- Track relevant user activity.
- Record login events and timestamps.
- Support administrative monitoring and accountability.

## Examination Set Rules

| Examination | Standard Sets | Additional Sets |
|---|---|---|
| Internal Assessment (IAT) | Set A and Set B | Requires Principal approval |
| End Semester Examination | Sets A, B, C, and D | Requires Principal approval |

Additional-set requests must follow the configured approval workflow. The system should record question usage only after the paper is finalized.

## Technology Stack

| Component | Technology |
|---|---|
| Frontend | React, TypeScript, Vite |
| Styling | Tailwind CSS |
| Backend | Node.js, Express |
| AI / PDF Extraction | Google Gemini API |
| Database | Supabase |
| File Storage | Supabase Storage |
| Icons | Lucide React |

## Project Structure

```text
exam-software-main/
├── public/
├── src/
│   ├── components/
│   ├── context/
│   ├── types/
│   ├── utils/
│   └── App.tsx
├── .env.example
├── package.json
├── vite.config.ts
└── README.md
```

*The project structure may evolve as new features are added.*

## Getting Started

### Prerequisites

Install the following before running the project:

- Node.js (LTS recommended)
- npm
- A Google Gemini API key
- A Supabase project

### 1. Clone the Repository

```bash
git clone https://github.com/deena303/msajce-question-paper.git
cd msajce-question-paper
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env` file in the project root directory.

Add the required environment variables:

```env
GEMINI_API_KEY=your_gemini_api_key
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

Replace the placeholder values with your actual credentials.

**Security Notice:**
- Never commit your `.env` file to GitHub.
- Never expose the Supabase service role key in frontend code.
- Keep API credentials on the backend.
- Configure environment variables separately for production deployment.

### 4. Configure Supabase

1. Create a Supabase project.
2. Run the required database SQL migrations.
3. Configure the required tables and relationships.
4. Create the private question bank storage bucket if file uploads use Supabase Storage.
5. Configure appropriate Row Level Security (RLS) policies and backend access permissions.

### 5. Start the Backend

Run the backend server using the project's configured start command.

If the project uses the `server` npm script:

```bash
npm run server
```

If no such script exists, use the backend start command defined in the project.

### 6. Start the Frontend

Open another terminal in the project directory:

```bash
npm run dev
```

Open the local URL displayed by Vite in your terminal.

## Build and Type Check

Run the TypeScript check:

```bash
npm run lint
```

Build the frontend for production:

```bash
npm run build
```

## Deployment

The frontend can be deployed using platforms such as Netlify or Vercel. The Express backend must also be deployed to a compatible server environment.

Before deployment:

- Configure production environment variables.
- Ensure the frontend API URL points to the deployed backend.
- Verify Gemini API access.
- Verify Supabase database and storage permissions.
- Test authentication, PDF extraction, and question paper generation.

## Security

This application handles examination-related data and administrative access. Production deployment should use secure authentication, server-side role validation, protected API endpoints, and appropriate database access policies.

Never store passwords, API keys, or service-role credentials in publicly accessible source code.

## Future Enhancements

- Improved question extraction and validation.
- Advanced question paper pattern customization.
- Enhanced audit reporting.
- Additional exam workflow automation.
- Improved question usage analytics.

## Developed For

**Mohamed Sathak AJ College of Engineering (MSAJCE)**

Question Paper Management System  
Developed by a student team from the Artificial Intelligence and Machine Learning Department.

## Repository

[GitHub – MSAJCE Question Paper Management System](https://github.com/deena303/msajce-question-paper)
