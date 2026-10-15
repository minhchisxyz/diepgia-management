import {Eye, EyeOff, Save, Search, Sheet, SquarePen, Trash, X} from "lucide-react";

export function DeleteButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="text-red-700 hover:underline">
      <Trash />
    </button>
  )
}

export function EditButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="text-blue-700 hover:underline">
      <SquarePen/>
    </button>
  )
}

export function CancelButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="text-gray-700 hover:underline">
      <X/>
    </button>
  )
}

export function SaveButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="text-green-700 hover:underline">
      <Save/>
    </button>
  )
}

export function SearchButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="text-blue-700 hover:underline">
      <Search/>
    </button>
  )
}

export function ExcelButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="text-green-700 hover:underline">
      <Sheet/>
    </button>
  )
}

export function ViewFormulaButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="text-purple-700 hover:underline">
      <Eye/>
    </button>
  )
}

export function CloseViewFormulaButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="text-purple-700 hover:underline">
      <EyeOff/>
    </button>
  )
}