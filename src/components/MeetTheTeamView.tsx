import React from 'react';
import { Linkedin, Github, Mail } from 'lucide-react';

import deenaImage from '../img/deena.erp.jpeg';
import baifinImage from '../img/baifin.erp.jpeg';
import fadhilImage from '../img/fadhil.erp.jpeg';
import mishalImage from '../img/mishal.erp.jpeg';
import pitcheImage from '../img/pitche.erp.jpeg';

interface TeamMember {
  name: string;
  roles: string[];
  image: string;
  github: string;
  linkedin: string;
  email: string;
}

const teamMembers: TeamMember[] = [
  {
    name: 'Deena V',
    roles: ['Full-Stack Developer'],
    image: deenaImage,
    github: 'https://github.com/deena303',
    linkedin: 'https://www.linkedin.com/in/deena-v-b95a63327',
    email: 'deenaofficial1507@gmail.com'
  },
  {
    name: 'Mohammed Baifin M',
    roles: ['Full-Stack Developer'],
    image: baifinImage,
    github: 'https://github.com/Baifin',
    linkedin: 'https://www.linkedin.com/in/mohammed-baifin-b1b522328?utm_source=share_via&utm_content=profile&utm_medium=member_ios',
    email: 'mohammedbaifin.m@gmail.com'
  },
  {
    name: 'Mohamed Fadhil',
    roles: ['Back-End Developer'],
    image: fadhilImage,
    github: 'https://github.com/Fadhil-123',
    linkedin: 'https://www.linkedin.com/in/mohamed-fadhil-830a80327?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=android_app',
    email: 'fadhilfazil18@gmail.com'
  },
  {
    name: 'Mishal N',
    roles: ['UI/UX Designer', 'Front-End Developer'],
    image: mishalImage,
    github: 'https://github.com/Mishal-N',
    linkedin: 'https://www.linkedin.com/in/mishal-n-72a527328',
    email: 'mishalnoormohamed2006@gmail.com'
  },
  {
    name: 'Pitche Eshwar R',
    roles: ['UI/UX Designer', 'QA Tester'],
    image: pitcheImage,
    github: 'https://github.com/pitcheeswar17',
    linkedin: 'https://www.linkedin.com/in/pitche-eshwar-r-363a62327?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=android_app',
    email: 'pitcheeswarrajamani01@gmail.com'
  }
];

interface TeamMemberCardProps {
  member: TeamMember;
}

const TeamMemberCard: React.FC<TeamMemberCardProps> = ({ member }) => {
  return (
    <div
      className="group flex flex-col items-center bg-white rounded-3xl border border-[#E5E7EB] p-6 shadow-xs hover:shadow-md hover:-translate-y-1 transition-all duration-200 cursor-default"
    >
      {/* Profile Image */}
      <div className="mb-4 shrink-0">
        <img
          src={member.image}
          alt={`Photo of ${member.name}`}
          className="w-24 h-24 rounded-full object-cover border-2 border-[#D71945] shadow-sm"
          onError={(e) => {
            // Fallback to initials if image fails
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      </div>

      {/* Name */}
      <h3 className="text-sm font-bold text-[#111827] text-center leading-tight mb-1">
        {member.name}
      </h3>

      {/* Roles */}
      <div className="mb-3 flex flex-col items-center gap-0.5 min-h-[36px]">
        {member.roles.map((role) => (
          <span
            key={role}
            className="text-[10px] font-extrabold tracking-wider uppercase text-[#D71945] text-center"
          >
            {role}
          </span>
        ))}
      </div>

      {/* Academic Info */}
      <p className="text-[10px] text-[#64748B] text-center leading-relaxed mb-4">
        Batch 2024–2028 · Artificial Intelligence &amp; Machine Learning
      </p>

      {/* Divider */}
      <div className="w-full border-t border-[#F1F5F9] mb-4" />

      {/* Social Icons */}
      <div className="flex items-center gap-3">
        {/* LinkedIn */}
        <a
          href={member.linkedin}
          target="_blank"
          rel="noopener noreferrer"
          title={`${member.name} on LinkedIn`}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-[#EAF3FF] text-[#1976D2] hover:bg-[#1976D2] hover:text-white transition-colors duration-150"
        >
          <Linkedin className="h-3.5 w-3.5" />
        </a>

        {/* GitHub */}
        <a
          href={member.github}
          target="_blank"
          rel="noopener noreferrer"
          title={`${member.name} on GitHub`}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F7F8FA] text-[#111827] hover:bg-[#111827] hover:text-white transition-colors duration-150"
        >
          <Github className="h-3.5 w-3.5" />
        </a>

        {/* Email */}
        <a
          href={`mailto:${member.email}`}
          title={`Email ${member.name}`}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-[#FFF0F3] text-[#D71945] hover:bg-[#D71945] hover:text-white transition-colors duration-150"
        >
          <Mail className="h-3.5 w-3.5" />
        </a>
      </div>
    </div>
  );
};

interface MeetTheTeamViewProps {
  onBack: () => void;
}

export const MeetTheTeamView: React.FC<MeetTheTeamViewProps> = ({ onBack }) => {
  return (
    <div className="space-y-8 pb-12">
      {/* Back Button */}
      <div>
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-semibold text-[#64748B] hover:text-[#D71945] transition-colors duration-150 group"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4 transition-transform group-hover:-translate-x-0.5"
          >
            <path d="M19 12H5" />
            <path d="M12 19l-7-7 7-7" />
          </svg>
          Back
        </button>
      </div>

      {/* Page Header */}
      <div className="text-center border-b border-[#E5E7EB] pb-8">
        <span className="text-[11px] font-extrabold uppercase tracking-widest text-[#D71945]">
          Meet the Team
        </span>
        <h1 className="mt-2 text-2xl sm:text-3xl font-black tracking-tight text-[#111827] leading-snug">
          Developers behind this<br className="hidden sm:block" /> Question Paper Management System
        </h1>
        <p className="mt-3 text-sm text-[#64748B] leading-relaxed max-w-xl mx-auto">
          This Question Paper Management System was designed and built by a student team from the{' '}
          <span className="font-semibold text-[#111827]">
            Artificial Intelligence &amp; Machine Learning Department
          </span>
          , Batch 2024–2028.
        </p>
      </div>

      {/* Team Cards Grid */}
      {/* First row: 3 members */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {teamMembers.slice(0, 3).map((member) => (
          <TeamMemberCard key={member.name} member={member} />
        ))}
      </div>

      {/* Second row: 2 members — centered */}
      <div className="flex justify-center">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 w-full lg:w-2/3">
          {teamMembers.slice(3).map((member) => (
            <TeamMemberCard key={member.name} member={member} />
          ))}
        </div>
      </div>
    </div>
  );
};
