/** A prop's place: (x, y) is where it touches the ground; its tap box is w wide, centred on x, and h tall above y. */
export interface PropSpot { x: number; y: number; w: number; h: number }

/** One world's art (spec 2026-10-04 §2): its day sky, the land in front of it, and where Truffle's things stand. */
export interface WorldArt {
  /** every id in the art starts with this, so several scenes on one page (the room's thumbnails) never clash */
  prefix: string;
  sky: string;
  land: string;
  props: Record<string, PropSpot>;
}
