const SimpleBot = () => {
  return (
    <div className="m-4">
      <h1>심플챗봇</h1>
      {/* 메시지 입력영역 */}
      <form className="flex mt-4">
        <input
          type="text"
          className="block rounded-md w-[500px] border-0 py-1 pl-2 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400"
          placeholder="메시지를 입력해주세요."
        />
        <button
          className="rounded-md bg-indigo-600 px-3 py-2 ml-4 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          type="submit"
        >
          전송
        </button>
      </form>

      {/* 메시지 출력영역 */}
      <div className="mt-4">
        <ul>
          <li>User:하이</li>
          <li>Bot:무엇을 도와드릴까요?</li>
        </ul>
      </div>
    </div>
  );
};

export default SimpleBot;
