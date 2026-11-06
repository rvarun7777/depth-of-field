import { useEffect, useRef, useState } from "react";
import { Box, Text, useColorModeValue } from "@chakra-ui/react";

export default function AxisScale({ min, max, marks, label }: {
  min: number; max: number; marks: { value: number; label: string }[]; label: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(260);
  const color = useColorModeValue("gray.800", "gray.100");
  useEffect(() => {
    if (!ref.current) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  const position = (value: number) => (value - min) / (max - min) * width;
  const sorted = marks.filter(m => m.value >= min && m.value <= max).sort((a, b) => a.value - b.value);
  const visible: typeof sorted = [];
  sorted.forEach((mark, index) => {
    if (index === 0 || index === sorted.length - 1 ||
      (position(mark.value) - position(visible[visible.length - 1].value) >= 64 &&
       position(sorted[sorted.length - 1].value) - position(mark.value) >= 64)) visible.push(mark);
  });
  return <Box ref={ref} aria-label={label} position="relative" h="32px" color={color}>
    {visible.map((mark, index) => <Box key={mark.value} position="absolute" left={`${(mark.value - min) / (max - min) * 100}%`} transform={index === 0 ? "translateX(0)" : index === visible.length - 1 ? "translateX(-100%)" : "translateX(-50%)"}>
      <Text fontSize="14px" fontWeight="semibold" whiteSpace="nowrap" lineHeight="24px">{mark.label}</Text>
    </Box>)}
  </Box>;
}
