"use client";

import { motion } from "framer-motion";
import SiteLink from "./SiteLink";

// Link yang bisa dianimasikan Framer Motion. dipakai dari Server Component
// (mis. homepage) yang nggak bisa langsung import `motion` dari framer-motion.
export const MotionLink = motion.create(SiteLink);
