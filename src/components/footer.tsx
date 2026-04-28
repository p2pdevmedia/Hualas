'use client';

import { Box, Flex, Text } from '@radix-ui/themes';
import { Share2Icon, PlayIcon } from '@radix-ui/react-icons';

export default function Footer() {
  return (
    <footer className="px-4 py-8 text-white bg-slate-800">
      <Box className="mx-auto max-w-4xl">
        <Flex direction="column" align="center" gap="4" className="text-center">
          <Text size="5" weight="bold">
            Club Hualas Patagónico
          </Text>
          <Flex gap="6" justify="center" wrap="wrap">
            <a
              href="https://www.instagram.com/hualas_patagonico/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 opacity-80 transition-opacity hover:opacity-100"
              aria-label="Instagram"
            >
              <Share2Icon width={20} height={20} />
              <span className="text-sm">@hualas_patagonico</span>
            </a>
            <a
              href="https://youtube.com/@escuelademontanahualas?si=j8VEKHbe9IRhXsw4"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 opacity-80 transition-opacity hover:opacity-100"
              aria-label="YouTube"
            >
              <PlayIcon width={20} height={20} />
              <span className="text-sm">@escuelademontanahualas</span>
            </a>
          </Flex>
          <Text size="2" className="opacity-60">
            San Martín de los Andes, Neuquén, Argentina 🇦🇷
          </Text>
        </Flex>
      </Box>
    </footer>
  );
}
