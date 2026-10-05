import { LoaiVatTu } from "@prisma/client";

export const loaiVatTuLabels = {
  [LoaiVatTu.THUNG]: "Thùng",
  [LoaiVatTu.CHAI]: "Chai",
  [LoaiVatTu.NHAN]: "Nhãn",
  [LoaiVatTu.TUI]: "Túi",
  [LoaiVatTu.BAO]: "Bao",
} satisfies Record<LoaiVatTu, string>;

export function getLoaiVatTuLabel(value: LoaiVatTu) {
  return loaiVatTuLabels[value];
}
