import {DatabasePlus, Eye, EyeOff, Info, LayersArrowUp, Save, Search, Sheet, SquarePen, Trash, X} from "lucide-react";
import {Tooltip, TooltipContent, TooltipTrigger} from "@/components/ui/tooltip";

export function DeleteButton({ onClick }: { onClick: () => void }) {
  return (
    <Tooltip>
      <TooltipTrigger render={
                         <button type="button"
                                 onClick={onClick}
                                 className="text-red-700 hover:text-red-500 hover:cursor-pointer">
                          <Trash/>
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
                         <button type="button"
                                 onClick={onClick}
                                 className="text-blue-700 hover:text-blue-500 hover:cursor-pointer">
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
                         <button type="button"
                                 onClick={onClick}
                                 className="text-zinc-700 hover:text-zinc-500 hover:cursor-pointer">
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
                         <button type="button"
                                 onClick={onClick}
                                 className="text-green-700 hover:text-green-500 hover:cursor-pointer">
                          <Save/>
                        </button>}
      />
      <TooltipContent>
        <p>Lưu</p>
      </TooltipContent>
    </Tooltip>
  )
}

export function SearchButton({ onClick }: { onClick?: () => void }) {
  return (
    <Tooltip>
      <TooltipTrigger render={
                         <button type="button"
                                 onClick={onClick}
                                 className="text-blue-700 hover:text-blue-500 hover:cursor-pointer">
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
                         <button type="button"
                                 onClick={onClick}
                                 className="text-green-700 hover:text-green-500 hover:cursor-pointer">
                          <Sheet/>
                        </button>}
      />
      <TooltipContent>
        <p>Xuất file Excel</p>
      </TooltipContent>
    </Tooltip>
  )
}

export function ViewButton({ onClick }: { onClick: () => void }) {
  return (
    <Tooltip>
      <TooltipTrigger render={
                         <button type="button"
                                 onClick={onClick}
                                 className="text-purple-700 hover:text-purple-500 hover:cursor-pointer">
                          <Eye/>
                        </button>}
      />
      <TooltipContent>
        <p>Xem</p>
      </TooltipContent>
    </Tooltip>
  )
}

export function CloseButton({ onClick }: { onClick: () => void }) {
  return (
    <Tooltip>
      <TooltipTrigger render={
                         <button type="button"
                                 onClick={onClick}
                                 className="text-purple-700 hover:text-purple-500 hover:cursor-pointer">
                          <EyeOff/>
                        </button>}
      />
      <TooltipContent>
        <p>Đóng</p>
      </TooltipContent>
    </Tooltip>
  )
}

export function ImportButton({ onClick }: { onClick: () => void }) {
  return (
    <Tooltip>
      <TooltipTrigger render={
                         <button type="button"
                                 onClick={onClick}
                                 className="text-green-700 hover:text-green-500 hover:cursor-pointer">
                          <DatabasePlus/>
                        </button>}
      />
      <TooltipContent>
        <p>Nhập hàng</p>
      </TooltipContent>
    </Tooltip>
  )
}

export function InfoButton({ onClick }: { onClick: () => void }) {
  return (
    <Tooltip>
      <TooltipTrigger render={
                         <button type="button"
                                 onClick={onClick}
                                 className="text-blue-900 hover:text-blue-700 hover:cursor-pointer">
                          <Info/>
                        </button>}
      />
      <TooltipContent>
        <p>Xem chi tiết</p>
      </TooltipContent>
    </Tooltip>
  )
}

export function ForwardButton({ onClick }: { onClick: () => void }) {
  return (
    <Tooltip>
      <TooltipTrigger render={
                         <button type="button"
                                 onClick={onClick}
                                 className="text-blue-900 hover:text-blue-700 hover:cursor-pointer">
                          <LayersArrowUp/>
                        </button>}
      />
      <TooltipContent>
        <p>Tạo mới</p>
      </TooltipContent>
    </Tooltip>
  )
}
