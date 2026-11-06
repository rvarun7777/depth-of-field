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
  if (width < 480 && sorted.length > 1) {
    // A phone needs breathing room, not a label at every available stop.
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    visible.push(first);
    const middle = sorted.slice(1, -1).sort((a, b) =>
      Math.abs(position(a.value) - width / 2) - Math.abs(position(b.value) - width / 2)
    )[0];
    // Conservative text-width estimates also protect long unit labels.
    if (middle && position(middle.value) - middle.label.length * 4.5 >= first.label.length * 9 + 24 &&
      width - last.label.length * 9 - (position(middle.value) + middle.label.length * 4.5) >= 24) visible.push(middle);
    visible.push(last);
  } else {
    sorted.forEach((mark, index) => {
      if (index === 0 || index === sorted.length - 1 ||
        (position(mark.value) - position(visible[visible.length - 1].value) >= 100 &&
         position(sorted[sorted.length - 1].value) - position(mark.value) >= 100)) visible.push(mark);
    });
  }
  return <Box ref={ref} aria-label={label} position="relative" h="40px" color={color}>
    {visible.map((mark, index) => <Box key={mark.value} position="absolute" left={`${(mark.value - min) / (max - min) * 100}%`} transform={index === 0 ? "translateX(0)" : index === visible.length - 1 ? "translateX(-100%)" : "translateX(-50%)"}>
      <Text fontSize="14px" fontWeight="semibold" whiteSpace="nowrap" lineHeight="24px">{mark.label}</Text>
    </Box>)}
  </Box>;
}
