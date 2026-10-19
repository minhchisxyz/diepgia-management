import {DatabasePlus, Eye, EyeOff, Save, Search, Sheet, SquarePen, Trash, X} from "lucide-react";
import {Tooltip, TooltipContent, TooltipTrigger} from "@/components/ui/tooltip";

export function DeleteButton({ onClick }: { onClick: () => void }) {
  return (
    <Tooltip>
      <TooltipTrigger render={
        <button type="button" onClick={onClick} className="text-red-700 hover:underline">
          <Trash />
        </button>}
      />
      <TooltipContent>
        <p>Xóa</p>
      </TooltipContent>
    </Tooltip>
  )
}

export function EditButton({ onClick }: { onClick: () => void }) {
  return (
    <Tooltip>
      <TooltipTrigger render={
        <button type="button" onClick={onClick} className="text-blue-700 hover:underline">
          <SquarePen/>
        </button>}
      />
      <TooltipContent>
        <p>Chỉnh sửa</p>
      </TooltipContent>
    </Tooltip>
  )
}

export function CancelButton({ onClick }: { onClick: () => void }) {
  return (
    <Tooltip>
      <TooltipTrigger render={
        <button type="button" onClick={onClick} className="text-zinc-700 hover:underline">
          <X/>
        </button>}
      />
      <TooltipContent>
        <p>Hủy</p>
      </TooltipContent>
    </Tooltip>
  )
}

export function SaveButton({ onClick }: { onClick: () => void }) {
  return (
    <Tooltip>
      <TooltipTrigger render={
        <button type="button" onClick={onClick} className="text-green-700 hover:underline">
          <Save/>
        </button>}
      />
      <TooltipContent>
        <p>Lưu</p>
      </TooltipContent>
    </Tooltip>
  )
}

export function SearchButton({ onClick }: { onClick: () => void }) {
  return (
    <Tooltip>
      <TooltipTrigger render={
        <button type="button" onClick={onClick} className="text-blue-700 hover:underline">
          <Search/>
        </button>}
      />
      <TooltipContent>
        <p>Tìm kiếm</p>
      </TooltipContent>
    </Tooltip>
  )
}

export function ExcelButton({ onClick }: { onClick: () => void }) {
  return (
    <Tooltip>
      <TooltipTrigger render={
        <button type="button" onClick={onClick} className="text-green-700 hover:underline">
          <Sheet/>
        </button>}
      />
      <TooltipContent>
        <p>Xuất file Excel</p>
      </TooltipContent>
    </Tooltip>
  )
}

export function ViewButton({ onClick, label = "Xem" }: { onClick: () => void; label?: string }) {
  return (
    <Tooltip>
      <TooltipTrigger render={
        <button type="button" onClick={onClick} className="text-purple-700 hover:underline">
          <Eye/>
        </button>}
      />
      <TooltipContent>
        <p>{label}</p>
      </TooltipContent>
    </Tooltip>
  )
}

export function CloseButton({ onClick, label = "Đóng" }: { onClick: () => void; label?: string }) {
  return (
    <Tooltip>
      <TooltipTrigger render={
        <button type="button" onClick={onClick} className="text-purple-700 hover:underline">
          <EyeOff/>
        </button>}
      />
      <TooltipContent>
        <p>{label}</p>
      </TooltipContent>
    </Tooltip>
  )
}

export const ViewFormulaButton = ViewButton
export const CloseViewFormulaButton = CloseButton

export function ImportButton({ onClick }: { onClick: () => void }) {
  return (
    <Tooltip>
      <TooltipTrigger render={
        <button type="button" onClick={onClick} className="text-green-700 hover:underline">
          <DatabasePlus/>
        </button>}
      />
      <TooltipContent>
        <p>Nhập hàng</p>
      </TooltipContent>
    </Tooltip>
  )
}
