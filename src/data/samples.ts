export interface SampleTopic {
  id: string;
  title: string;
  wikiTitle: string;
  lang: string;
  category: string;
  description: string;
  thumbnail: string;
  badge: string;
}

export const SAMPLE_TOPICS: SampleTopic[] = [
  {
    id: 'einstein',
    title: 'Albert Einstein',
    wikiTitle: 'Albert Einstein',
    lang: 'vi',
    category: 'Vật lý & Khoa học',
    description: 'Nhà vật lý lý thuyết vĩ đại, cha đẻ Thuyết tương đối và Hiệu ứng quang điện.',
    thumbnail: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d3/Albert_Einstein_Head.jpg/440px-Albert_Einstein_Head.jpg',
    badge: 'Mẫu Phổ Biến'
  },
  {
    id: 'ai',
    title: 'Trí tuệ nhân tạo (AI)',
    wikiTitle: 'Trí tuệ nhân tạo',
    lang: 'vi',
    category: 'Công nghệ & Máy tính',
    description: 'Khái niệm, Machine Learning, Deep Learning, Mạng Nơ-ron và tác động xã hội.',
    thumbnail: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/05/HONDA_ASIMO.jpg/440px-HONDA_ASIMO.jpg',
    badge: 'Hot Trends'
  },
  {
    id: 'dai-viet',
    title: 'Đại Việt',
    wikiTitle: 'Đại Việt',
    lang: 'vi',
    category: 'Lịch sử Việt Nam',
    description: 'Các triều đại Lý, Trần, Lê, Nguyễn, văn hóa, quân sự và các trận đánh vang dội.',
    thumbnail: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Khu_Khu%C3%AA_V%C4%83n_C%C3%A1c_2020.jpg/440px-Khu_Khu%C3%AA_V%C4%83n_C%C3%A1c_2020.jpg',
    badge: 'Lịch Sử Việt Nam'
  },
  {
    id: 'ww2',
    title: 'Thế chiến thứ hai',
    wikiTitle: 'Thế chiến thứ hai',
    lang: 'vi',
    category: 'Lịch sử Thế giới',
    description: 'Cuộc chiến tranh quy mô nhất lịch sử nhân loại, hình thành Trật tự Thế giới mới.',
    thumbnail: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d7/World_War_II_Casualties.svg/440px-World_War_II_Casualties.svg.png',
    badge: 'Sự Kiện Toàn Cầu'
  },
  {
    id: 'renaissance',
    title: 'Phục Hưng',
    wikiTitle: 'Phục Hưng',
    lang: 'vi',
    category: 'Văn hóa & Nghệ thuật',
    description: 'Cú húc văn hóa, nghệ thuật, triết học và khoa học đánh dấu sự kết thúc Thời Kỳ Đen Tối.',
    thumbnail: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ec/Mona_Lisa%2C_by_Leonardo_da_Vinci%2C_from_C2RMF_retouched.jpg/440px-Mona_Lisa%2C_by_Leonardo_da_Vinci%2C_from_C2RMF_retouched.jpg',
    badge: 'Nghệ Thuật'
  },
  {
    id: 'quantum',
    title: 'Cơ học lượng tử',
    wikiTitle: 'Cơ học lượng tử',
    lang: 'vi',
    category: 'Khoa học Vũ trụ',
    description: 'Nền tảng của vật lý hiện đại nghiên cứu chuyển động của vi hạt và sóng.',
    thumbnail: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e7/Hydrogen_Density_Plots.png/440px-Hydrogen_Density_Plots.png',
    badge: 'Đột Phá'
  }
];

export const CATEGORY_COLORS: Record<string, { bg: string; border: string; text: string; dot: string }> = {
  person: { bg: 'bg-indigo-50 dark:bg-indigo-950/40', border: 'border-indigo-200 dark:border-indigo-800', text: 'text-indigo-700 dark:text-indigo-300', dot: '#6366f1' },
  event: { bg: 'bg-rose-50 dark:bg-rose-950/40', border: 'border-rose-200 dark:border-rose-800', text: 'text-rose-700 dark:text-rose-300', dot: '#f43f5e' },
  location: { bg: 'bg-emerald-50 dark:bg-emerald-950/40', border: 'border-emerald-200 dark:border-emerald-800', text: 'text-emerald-700 dark:text-emerald-300', dot: '#10b981' },
  concept: { bg: 'bg-amber-50 dark:bg-amber-950/40', border: 'border-amber-200 dark:border-amber-800', text: 'text-amber-700 dark:text-amber-300', dot: '#f59e0b' },
  organization: { bg: 'bg-sky-50 dark:bg-sky-950/40', border: 'border-sky-200 dark:border-sky-800', text: 'text-sky-700 dark:text-sky-300', dot: '#0284c7' },
  discovery: { bg: 'bg-purple-50 dark:bg-purple-950/40', border: 'border-purple-200 dark:border-purple-800', text: 'text-purple-700 dark:text-purple-300', dot: '#a855f7' },
  period: { bg: 'bg-teal-50 dark:bg-teal-950/40', border: 'border-teal-200 dark:border-teal-800', text: 'text-teal-700 dark:text-teal-300', dot: '#14b8a6' },
  other: { bg: 'bg-slate-50 dark:bg-slate-900', border: 'border-slate-200 dark:border-slate-700', text: 'text-slate-700 dark:text-slate-300', dot: '#64748b' }
};

export const CATEGORY_LABELS_VI: Record<string, string> = {
  person: 'Nhân vật',
  event: 'Sự kiện',
  location: 'Địa điểm',
  concept: 'Khái niệm',
  organization: 'Tổ chức',
  discovery: 'Phát minh / Tác phẩm',
  period: 'Thời kỳ / Giai đoạn',
  other: 'Khác'
};

export const CATEGORY_LABELS_EN: Record<string, string> = {
  person: 'Person',
  event: 'Event',
  location: 'Location',
  concept: 'Concept / Theory',
  organization: 'Organization',
  discovery: 'Invention / Work',
  period: 'Period / Era',
  other: 'Other'
};

export const SAMPLE_TOPICS_EN: SampleTopic[] = [
  {
    id: 'einstein',
    title: 'Albert Einstein',
    wikiTitle: 'Albert Einstein',
    lang: 'en',
    category: 'Physics & Science',
    description: 'Theoretical physicist who developed the theory of relativity and quantum mechanics principles.',
    thumbnail: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d3/Albert_Einstein_Head.jpg/440px-Albert_Einstein_Head.jpg',
    badge: 'Popular Sample'
  },
  {
    id: 'ai',
    title: 'Artificial Intelligence',
    wikiTitle: 'Artificial intelligence',
    lang: 'en',
    category: 'Tech & Computing',
    description: 'Machine learning, deep neural networks, cognitive computing, and societal impacts.',
    thumbnail: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/05/HONDA_ASIMO.jpg/440px-HONDA_ASIMO.jpg',
    badge: 'Hot Trends'
  },
  {
    id: 'industrial-rev',
    title: 'Industrial Revolution',
    wikiTitle: 'Industrial Revolution',
    lang: 'en',
    category: 'World History',
    description: 'The transition to new manufacturing processes in Great Britain, continental Europe, and the US.',
    thumbnail: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Khu_Khu%C3%AA_V%C4%83n_C%C3%A1c_2020.jpg/440px-Khu_Khu%C3%AA_V%C4%83n_C%C3%A1c_2020.jpg',
    badge: 'World History'
  },
  {
    id: 'ww2',
    title: 'World War II',
    wikiTitle: 'World War II',
    lang: 'en',
    category: 'World History',
    description: 'A global war that lasted from 1939 to 1945 involving the vast majority of the world\'s countries.',
    thumbnail: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d7/World_War_II_Casualties.svg/440px-World_War_II_Casualties.svg.png',
    badge: 'Global Event'
  },
  {
    id: 'renaissance',
    title: 'The Renaissance',
    wikiTitle: 'Renaissance',
    lang: 'en',
    category: 'Culture & Art',
    description: 'A fervent period of European cultural, artistic, political, and economic rebirth.',
    thumbnail: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ec/Mona_Lisa%2C_by_Leonardo_da_Vinci%2C_from_C2RMF_retouched.jpg/440px-Mona_Lisa%2C_by_Leonardo_da_Vinci%2C_from_C2RMF_retouched.jpg',
    badge: 'Art & Culture'
  },
  {
    id: 'quantum',
    title: 'Quantum Mechanics',
    wikiTitle: 'Quantum mechanics',
    lang: 'en',
    category: 'Space & Science',
    description: 'Fundamental physics theory describing the physical properties of nature at the atomic scale.',
    thumbnail: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e7/Hydrogen_Density_Plots.png/440px-Hydrogen_Density_Plots.png',
    badge: 'Breakthrough'
  }
];

