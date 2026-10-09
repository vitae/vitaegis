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
  color: string;
}

/** Every VITAEGIS channel, in the order the Connect section and the footer show them. */
export const socials: Social[] = [
  { name: 'Facebook', icon: FaFacebook, href: 'https://facebook.com/vitaegis', color: '#00ff00' },
  {
    name: 'Instagram',
    icon: FaInstagram,
    href: 'https://instagram.com/vitaegis',
    color: '#00ff00',
  },
  { name: 'YouTube', icon: FaYoutube, href: 'https://youtube.com/@vitaegis', color: '#FF0000' },
  { name: 'TikTok', icon: FaTiktok, href: 'https://tiktok.com/@vitaegis', color: '#00ff00' },
  { name: 'X', icon: FaTwitter, href: 'https://x.com/vitaegis', color: '#00ff00' },
  { name: 'Twitch', icon: FaTwitch, href: 'https://twitch.tv/vitaegis', color: '#ff00ff' },
  { name: 'Discord', icon: FaDiscord, href: 'https://discord.gg/vitaegis', color: '#7289DA' },
  { name: 'GitHub', icon: FaGithub, href: 'https://github.com/vitae', color: '#ffffff' },
];
