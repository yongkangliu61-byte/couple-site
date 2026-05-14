// ============================================================
// 情侣网站配置文件 - 修改这里的内容即可自定义整个网站
// ============================================================

// 管理员密码的 SHA-256 哈希（默认密码：20240101）
// 修改密码：在管理面板 -> 设置中修改，或运行: echo -n "新密码" | shasum -a 256
export const adminPasswordHash = '0a5bff6d9cc8a3ebe1b121c8deffc86ea8fd7e3bf4a372464b02259d08815267';

// 主题颜色预设
export const themePresets = {
  pink: {
    label: '粉色（默认）',
    primary: '#ec407a',
    primaryDark: '#d81b60',
    primaryDarker: '#c2185b',
    primaryLight: '#fce4ec',
    primaryMid: '#f8bbd0',
    primaryMid2: '#f48fb1',
    heroGradientEnd: '#f06292',
    heroBg: 'linear-gradient(135deg, #fce4ec 0%, #f8bbd0 25%, #f48fb1 50%, #f06292 75%, #ec407a 100%)',
    timelineBg: 'linear-gradient(180deg, #fff 0%, #fce4ec 50%, #fff 100%)',
    loginBg: 'linear-gradient(135deg, #fce4ec 0%, #f8bbd0 30%, #f48fb1 60%, #ec407a 100%)',
    timelineLine: 'linear-gradient(to bottom, #f48fb1, #ec407a, #f48fb1)',
    adminHeaderBg: 'linear-gradient(135deg, #ec407a, #d81b60)',
    badgeBg: 'linear-gradient(135deg, #ec407a, #d81b60)',
    progressFill: 'linear-gradient(90deg, #ec407a, #d81b60)',
    albumCoverBg: 'linear-gradient(135deg, #fce4ec, #f8bbd0)',
  },
  blue: {
    label: '天空蓝',
    primary: '#42a5f5',
    primaryDark: '#1e88e5',
    primaryDarker: '#1565c0',
    primaryLight: '#e3f2fd',
    primaryMid: '#bbdefb',
    primaryMid2: '#90caf9',
    heroGradientEnd: '#5c9ce6',
    heroBg: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 25%, #90caf9 50%, #64b5f6 75%, #42a5f5 100%)',
    timelineBg: 'linear-gradient(180deg, #fff 0%, #e3f2fd 50%, #fff 100%)',
    loginBg: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 30%, #90caf9 60%, #42a5f5 100%)',
    timelineLine: 'linear-gradient(to bottom, #90caf9, #42a5f5, #90caf9)',
    adminHeaderBg: 'linear-gradient(135deg, #42a5f5, #1e88e5)',
    badgeBg: 'linear-gradient(135deg, #42a5f5, #1e88e5)',
    progressFill: 'linear-gradient(90deg, #42a5f5, #1e88e5)',
    albumCoverBg: 'linear-gradient(135deg, #e3f2fd, #bbdefb)',
  },
  purple: {
    label: '浪漫紫',
    primary: '#ab47bc',
    primaryDark: '#8e24aa',
    primaryDarker: '#7b1fa2',
    primaryLight: '#f3e5f5',
    primaryMid: '#e1bee7',
    primaryMid2: '#ce93d8',
    heroGradientEnd: '#9c27b0',
    heroBg: 'linear-gradient(135deg, #f3e5f5 0%, #e1bee7 25%, #ce93d8 50%, #ba68c8 75%, #ab47bc 100%)',
    timelineBg: 'linear-gradient(180deg, #fff 0%, #f3e5f5 50%, #fff 100%)',
    loginBg: 'linear-gradient(135deg, #f3e5f5 0%, #e1bee7 30%, #ce93d8 60%, #ab47bc 100%)',
    timelineLine: 'linear-gradient(to bottom, #ce93d8, #ab47bc, #ce93d8)',
    adminHeaderBg: 'linear-gradient(135deg, #ab47bc, #8e24aa)',
    badgeBg: 'linear-gradient(135deg, #ab47bc, #8e24aa)',
    progressFill: 'linear-gradient(90deg, #ab47bc, #8e24aa)',
    albumCoverBg: 'linear-gradient(135deg, #f3e5f5, #e1bee7)',
  },
  green: {
    label: '清新绿',
    primary: '#66bb6a',
    primaryDark: '#43a047',
    primaryDarker: '#2e7d32',
    primaryLight: '#e8f5e9',
    primaryMid: '#c8e6c9',
    primaryMid2: '#a5d6a7',
    heroGradientEnd: '#4caf50',
    heroBg: 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 25%, #a5d6a7 50%, #81c784 75%, #66bb6a 100%)',
    timelineBg: 'linear-gradient(180deg, #fff 0%, #e8f5e9 50%, #fff 100%)',
    loginBg: 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 30%, #a5d6a7 60%, #66bb6a 100%)',
    timelineLine: 'linear-gradient(to bottom, #a5d6a7, #66bb6a, #a5d6a7)',
    adminHeaderBg: 'linear-gradient(135deg, #66bb6a, #43a047)',
    badgeBg: 'linear-gradient(135deg, #66bb6a, #43a047)',
    progressFill: 'linear-gradient(90deg, #66bb6a, #43a047)',
    albumCoverBg: 'linear-gradient(135deg, #e8f5e9, #c8e6c9)',
  },
  orange: {
    label: '暖橘色',
    primary: '#ff7043',
    primaryDark: '#f4511e',
    primaryDarker: '#e64a19',
    primaryLight: '#fff3e0',
    primaryMid: '#ffe0b2',
    primaryMid2: '#ffcc80',
    heroGradientEnd: '#ff5722',
    heroBg: 'linear-gradient(135deg, #fff3e0 0%, #ffe0b2 25%, #ffcc80 50%, #ffab40 75%, #ff7043 100%)',
    timelineBg: 'linear-gradient(180deg, #fff 0%, #fff3e0 50%, #fff 100%)',
    loginBg: 'linear-gradient(135deg, #fff3e0 0%, #ffe0b2 30%, #ffcc80 60%, #ff7043 100%)',
    timelineLine: 'linear-gradient(to bottom, #ffcc80, #ff7043, #ffcc80)',
    adminHeaderBg: 'linear-gradient(135deg, #ff7043, #f4511e)',
    badgeBg: 'linear-gradient(135deg, #ff7043, #f4511e)',
    progressFill: 'linear-gradient(90deg, #ff7043, #f4511e)',
    albumCoverBg: 'linear-gradient(135deg, #fff3e0, #ffe0b2)',
  },
};

// 默认主题名称
export const defaultTheme = 'pink';

// 情侣名字
export const coupleNames = {
  boy: '刘永康',
  girl: '成丽',
};

// 恋爱起始日期（格式：YYYY-MM-DD）
export const startDate = '2024-01-01';

// 纪念日列表（每年都会倒计时）
// type: 'anniversary' | 'birthday-boy' | 'birthday-girl' | 'valentine'
export const anniversaries = [
  { name: '恋爱周年纪念日', date: '01-01', type: 'anniversary', icon: '💕' },
  { name: '永康的生日', date: '06-15', type: 'birthday-boy', icon: '🎂' },
  { name: '成丽的生日', date: '09-20', type: 'birthday-girl', icon: '🎂' },
  { name: '七夕情人节', date: '08-29', type: 'valentine', icon: '🌹' },
  { name: '520 表白日', date: '05-20', type: 'valentine', icon: '💌' },
];

// 爱情时间线事件
export const timelineEvents = [
  {
    date: '2023-09-15',
    title: '初次相识',
    description: '在那个秋天的午后，我们第一次遇见了彼此，命运的齿轮开始转动。',
    icon: '✨',
  },
  {
    date: '2023-11-20',
    title: '第一次约会',
    description: '一起看了电影，吃了晚餐，聊到忘记时间。那一天我知道，你就是对的人。',
    icon: '🎬',
  },
  {
    date: '2023-12-24',
    title: '平安夜告白',
    description: '在漫天星辰和圣诞灯光下，我鼓起勇气说出口的那句话，是我们故事最美的开始。',
    icon: '💝',
    image: '',
    video: 'https://www.w3schools.com/html/mov_bbb.mp4',
  },
  {
    date: '2024-01-01',
    title: '正式在一起',
    description: '新的一年，新的开始。从这一天起，我们成为了彼此生命中最重要的人。',
    icon: '💑',
  },
  {
    date: '2024-02-14',
    title: '第一个情人节',
    description: '第一次以恋人的身份度过情人节，每一秒都是甜蜜。',
    icon: '🌹',
  },
  {
    date: '2024-05-01',
    title: '第一次旅行',
    description: '一起去了心心念念的地方，留下了只属于我们的回忆。',
    icon: '✈️',
    image: 'https://picsum.photos/seed/travel/800/400',
    video: '',
  },
  {
    date: '2024-10-01',
    title: '第一次一起做饭',
    description: '虽然厨艺不精，但和你一起做的每一道菜都是世界上最好的味道。',
    icon: '🍳',
  },
];

// 相册元数据（名称、描述、封面图）
export const albumMeta = {
  '甜蜜日常': {
    description: '记录我们在一起的每一天，那些平凡又珍贵的瞬间。',
    cover: 'https://picsum.photos/seed/couple1/400/300',
  },
  '旅行回忆': {
    description: '一起走过的路，看过的风景，都是最美的回忆。',
    cover: 'https://picsum.photos/seed/couple4/400/300',
  },
};

// 照片画廊（替换为你自己的照片路径）
// 目前使用占位图片，请替换为真实照片
export const galleryPhotos = [
  {
    id: 1,
    src: 'https://picsum.photos/seed/couple1/800/600',
    thumb: 'https://picsum.photos/seed/couple1/400/300',
    caption: '我们的第一张合照',
    note: '那天我们都很害羞，但按下快门的那一刻，我知道这张照片会成为我最珍贵的宝物。',
    album: '甜蜜日常',
  },
  {
    id: 2,
    src: 'https://picsum.photos/seed/couple2/800/600',
    thumb: 'https://picsum.photos/seed/couple2/400/300',
    caption: '最开心的一天',
    album: '甜蜜日常',
  },
  {
    id: 3,
    src: 'https://picsum.photos/seed/couple3/800/600',
    thumb: 'https://picsum.photos/seed/couple3/400/300',
    caption: '一起看日落',
    album: '甜蜜日常',
  },
  {
    id: 4,
    src: 'https://picsum.photos/seed/couple4/800/600',
    thumb: 'https://picsum.photos/seed/couple4/400/300',
    caption: '旅行的回忆',
    album: '旅行回忆',
  },
  {
    id: 5,
    src: 'https://picsum.photos/seed/couple5/800/800',
    thumb: 'https://picsum.photos/seed/couple5/400/400',
    caption: '甜蜜时光',
    album: '旅行回忆',
  },
  {
    id: 6,
    src: 'https://picsum.photos/seed/couple6/800/600',
    thumb: 'https://picsum.photos/seed/couple6/400/300',
    caption: '最好的我们',
    album: '旅行回忆',
  },
  {
    id: 7,
    src: 'https://picsum.photos/seed/couple7/800/600',
    thumb: 'https://picsum.photos/seed/couple7/400/300',
    caption: '每天都是情人节',
    album: '甜蜜日常',
  },
  {
    id: 8,
    src: 'https://picsum.photos/seed/couple8/800/800',
    thumb: 'https://picsum.photos/seed/couple8/400/400',
    caption: '和你在一起',
    album: '甜蜜日常',
  },
  {
    id: 9,
    src: 'https://picsum.photos/seed/couple9/800/600',
    thumb: 'https://picsum.photos/seed/couple9/400/300',
    caption: '最温暖的拥抱',
    album: '甜蜜日常',
  },
];
