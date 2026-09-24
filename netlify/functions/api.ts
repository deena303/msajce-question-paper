import serverless from 'serverless-http';
import app from '../../server/app';

// Netlify Function handler wrapping the Express application
export const handler = serverless(app);
