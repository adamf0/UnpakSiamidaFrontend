import ErrorImg from "@/assets/data-breach.png";

const ErrorPage = ({message = "Data tidak dapat ditampilkan saat ini.\nJika masalah berlanjut, hubungi administrator."}) => {
    return (
    <div className="bg-white w-full h-screen">
      <div className="h-screen flex items-center justify-center p-6">
        <div className="flex flex-col items-center text-center gap-3 border rounded-lg bg-white shadow-sm p-6 max-w-md">
          <img src={ErrorImg} alt="error" className="w-32" />

          <h2 className="text-base font-semibold text-gray-800">
            Ada masalah pada aplikasi
          </h2>

          <p className="text-sm text-gray-500">
            {message}
          </p>

          <div className="flex gap-2">
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-purple-600 text-white text-sm rounded hover:bg-purple-500"
            >
              Coba Lagi
            </button>

          </div>
        </div>
      </div>
    </div>
  );
};

export default ErrorPage;
