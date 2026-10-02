import type { IconType } from 'react-icons';
import {
  FaDiscord,
  FaTwitter,
  FaGithub,
  FaYoutube,
  FaTwitch,
  FaInstagram,
  FaFacebook,
  FaTiktok,
} from 'react-icons/fa';

export interface Social {
  name: string;
  icon: IconType;
  href: string;
  members: string;
  color: string;
}

/** Every VITAEGIS channel, in the order the Connect section and the footer show them. */
export const socials: Social[] = [
  { name: 'Facebook', icon: FaFacebook, href: 'https://facebook.com/vitaegis', members: '1M', color: '#00ff00' },
  { name: 'Instagram', icon: FaInstagram, href: 'https://instagram.com/vitaegis', members: '5M', color: '#00ff00' },
  { name: 'YouTube', icon: FaYoutube, href: 'https://youtube.com/@vitaegis', members: '3M', color: '#FF0000' },
  { name: 'TikTok', icon: FaTiktok, href: 'https://tiktok.com/@vitaegis', members: '2M', color: '#00ff00' },
  { name: 'X', icon: FaTwitter, href: 'https://x.com/vitaegis', members: '2.5M', color: '#00ff00' },
  { name: 'Twitch', icon: FaTwitch, href: 'https://twitch.tv/vitaegis', members: '5.8K', color: '#ff00ff' },
  { name: 'Discord', icon: FaDiscord, href: 'https://discord.gg/vitaegis', members: '20K', color: '#7289DA' },
  { name: 'GitHub', icon: FaGithub, href: 'https://github.com/vitae', members: '1K', color: '#ffffff' },
];
