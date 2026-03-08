export default function FullScreenLoader({ message = "Please wait..." }) {
    return (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-slate-50/80 backdrop-blur-sm">
            <div className="w-16 h-16 border-4 border-slate-300 border-t-slate-900 rounded-full animate-spin"></div>
            <p className="mt-4 text-slate-800 font-semibold text-lg">{message}</p>
        </div>
    );
}
