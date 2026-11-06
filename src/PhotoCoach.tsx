import { useState } from "react";
import { Box, Button, Collapse, Flex, Heading, Select, SimpleGrid, Text, useColorModeValue } from "@chakra-ui/react";
import { formatShutter } from "./lighting";

export type Lesson = "portrait" | "together" | "scenery";
type Props = {
  focal: number; aperture: number; distanceMM: number; nearMM: number; farMM: number;
  shutter: number; iso: number; exposureDelta: number; crop: number;
  lensName?: string; apertureMin: number; video: boolean; imperial: boolean;
  onLesson: (lesson: Lesson) => void;
};
const GOALS = {
  portrait: { label: "Portrait of my wife", advice: "Focus on the nearer eye. Put your subject farther from the background for more separation. Start near 1/250 s for a posed person; movement may need 1/500 s or faster.", exercise: "Change f/5.6 to f/8. Watch the sharp zone grow and the preview darken if shutter and ISO stay fixed. Then restore exposure using shutter or ISO." },
  together: { label: "Both of us in focus", advice: "Keep your faces about the same distance from the camera. Start around f/5.6–f/8, focus on a face, and check that both faces lie inside the sharp zone. A tripod and self-timer help you get into the picture.", exercise: "Move the subject closer using the distance slider. Notice the narrower sharp zone. Moving back or using a smaller aperture (higher f-number) gives more focus tolerance." },
  scenery: { label: "Scenery and buildings", advice: "Start around f/8 and a wide focal length. Check that the nearest important foreground and the distant scene fit inside the sharp zone. Use a tripod when the required shutter is too slow.", exercise: "Change 18mm to 35mm without changing your distance. The framing tightens and the sharp zone changes. Avoid defaulting to f/22: diffraction can soften fine detail." },
};

export default function PhotoCoach(p: Props) {
  const [open, setOpen] = useState(true);
  const [goal, setGoal] = useState<Lesson>("portrait");
  const bg = useColorModeValue("blue.50", "gray.800");
  const border = useColorModeValue("blue.200", "blue.600");
  const card = useColorModeValue("white", "gray.700");
  const fmt = (mm: number) => p.imperial ? `${(mm / 304.8).toFixed(1)} ft` : `${(mm / 1000).toFixed(2)} m`;
  const far = p.farMM <= 0 || !Number.isFinite(p.farMM) ? "infinity" : fmt(p.farMM);
  const slowForPeople = goal !== "scenery" && p.shutter > 1 / 250;
  const shake = p.shutter > 1 / (p.focal * p.crop);
  const exposure = Math.abs(p.exposureDelta) < 0.5 ? "Close to the simulator’s target exposure." : `${Math.abs(p.exposureDelta).toFixed(1)} stops ${p.exposureDelta > 0 ? "brighter" : "darker"} than the simulator’s target. ${p.exposureDelta > 0 ? "Try a faster shutter, lower ISO, or higher f-number." : "Try raising ISO, a lower f-number if available, or a slower shutter when your subject is still."}`;
  return <Box as="section" aria-label="Photography coach" lang="en" m={{ base: 3, md: 6 }} p={{ base: 4, md: 5 }} bg={bg} borderWidth="1px" borderColor={border} rounded="xl">
    <Flex justify="space-between" align="center" gap={3}>
      <Box><Heading as="h2" size="md">Learn with your camera</Heading><Text fontSize="sm" mt={1}>Understand the settings, then try one change at a time.</Text></Box>
      <Button size="sm" flexShrink={0} onClick={() => setOpen(!open)} aria-expanded={open} aria-controls="photo-coach-content">{open ? "Hide tips" : "Show tips"}</Button>
    </Flex>
    <Collapse in={open} animateOpacity><Box id="photo-coach-content" pt={4}>
      <Text as="label" htmlFor="photo-goal" fontWeight="semibold">What are you photographing?</Text>
      <Select id="photo-goal" value={goal} onChange={e => setGoal(e.target.value as Lesson)} bg={card} mt={2} maxW="400px">
        {Object.entries(GOALS).map(([key, value]) => <option key={key} value={key}>{value.label}</option>)}
      </Select>
      <Text mt={3}>{GOALS[goal].advice}</Text>
      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3} mt={4}>
        <Box bg={card} p={4} rounded="lg"><Heading as="h3" size="sm">Framing and focus</Heading>
          <Text mt={2}>{p.focal}mm at {fmt(p.distanceMM)}: approximately {Math.round(p.focal * p.crop)}mm full-frame-equivalent framing. Focal length changes framing; moving the camera changes perspective.</Text>
          <Text mt={2}>At f/{p.aperture}, the estimated sharp zone is {fmt(p.nearMM)} to {far}. Keep the important parts of your subject within it. This is a tolerance zone, not a hard boundary.</Text>
          <Text mt={2}>{p.lensName ? `${p.lensName}: the modeled widest aperture here is f/${p.apertureMin}.` : "Select a lens to see its modeled aperture limit."} A lower f-number admits more light and narrows depth of field; a higher number does the reverse.</Text>
        </Box>
        <Box bg={card} p={4} rounded="lg"><Heading as="h3" size="sm">Movement and brightness</Heading>
          <Text mt={2}>{formatShutter(p.shutter)} · ISO {p.iso}. {exposure}</Text>
          <Text mt={2}>{p.video ? "You are in video mode. The portrait shutter suggestions here are for still photos; load a lesson to switch to photo mode." : slowForPeople ? "Your shutter is slower than the 1/250 s starting point for portraits. If your subject moves, try a faster shutter and raise ISO to compensate." : "For still photos, check motion at full size: even a fast shutter is not a guarantee of a sharp subject."}</Text>
          <Text mt={2}>{shake ? "Your shutter is slower than the rough reciprocal-focal-length handheld guideline. Brace the camera, use a tripod, or increase shutter speed. " : ""}VR can reduce camera shake; it cannot freeze a moving person. Raising ISO can add noise, but a sharp, slightly noisy portrait is often preferable to motion blur.</Text>
        </Box>
      </SimpleGrid>
      <Box mt={4}><Heading as="h3" size="sm">Try it on your D5500</Heading>
        <Text mt={2}>{GOALS[goal].exercise}</Text>
        <Button mt={3} colorScheme="blue" whiteSpace="normal" height="auto" py={2} onClick={() => p.onLesson(goal)}>Load {GOALS[goal].label.toLowerCase()} lesson</Button>
        <Text fontSize="sm" mt={2}>Loads your D5500 and 18–55mm lens, a daylight scene, and manual photo settings. It replaces the current setup. Match these settings on your camera, then check the result.</Text>
      </Box>
      <Text fontSize="sm" mt={4}>For Lightroom: shoot RAW and protect important highlights. Editing can improve tone and color, but it cannot reliably repair missed focus or motion blur. The preview is illustrative; zoom aperture limits are estimated, and real bokeh, autofocus, and VR are not simulated. Coaching is currently in English.</Text>
    </Box></Collapse>
  </Box>;
}
