import { cn } from '@/lib/utils';

interface LogoProps extends React.SVGProps<SVGSVGElement> {
    className?: string;
}

const Logo = ({ className, ...props }: LogoProps) => {
    return (
        <svg
            className={cn(className)}
            fill="none"
            viewBox="0 0 64 64"
            xmlns="http://www.w3.org/2000/svg"
            {...props}
        >
            <rect
                fill="url(#santatra-gradient)"
                height="52"
                rx="16"
                width="52"
                x="6"
                y="6"
            />
            <path
                d="M20 41.5C22.8 45.1667 26.8 47 32 47C38.4667 47 43 43.9667 43 39C43 34.3333 39.4667 32.0667 33.5 30.75L30.25 30.05C26.7167 29.2833 25 28.3833 25 26.2C25 23.7 27.2833 22 31.15 22C34.85 22 37.5833 23.25 39.9 25.95"
                stroke="white"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="4.5"
            />
            <path
                d="M32 17V47"
                stroke="white"
                strokeLinecap="round"
                strokeWidth="4.5"
            />
            <defs>
                <linearGradient
                    id="santatra-gradient"
                    x1="6"
                    x2="58"
                    y1="6"
                    y2="58"
                    gradientUnits="userSpaceOnUse"
                >
                    <stop stopColor="#38BDF8" />
                    <stop offset="1" stopColor="#0F172A" />
                </linearGradient>
            </defs>
        </svg>
    );
};

export default Logo;
