//기본호출주소: http://localhost:3000/api/bot

//next 패키내에 클라이언트 요청과 서버 응답객체의 타입참조하기
import type { NextApiRequest, NextApiResponse } from 'next';

//메시지 인터페이스 타입 참조하기
import { IMemberMessage, UserType } from '@/interfaces/message';

//LangChain에서 제공하는 시스템메시지(역할기반챗봇지정)과 휴먼메시지타입 참조하기
//SystemMessage: LLM챗봇에게 역할을 지정할떄사용함
//HumanMessage: LLM챗봇에 전달할 사용자메시지 타입입니다.
import { SystemMessage, HumanMessage } from '@langchain/core/messages';

//프롬프트 템플릿 참조하기
import { ChatPromptTemplate } from '@langchain/core/prompts';

//LLM 응답메시지 타입을 원하는 타입결과물로 파싱(변환)해주는 아웃풋파서참조하기
//StringOutputParser는 AIMessage타입에서 content속성값만 문자열로 반환해주는 파서입니다.
import { StringOutputParser } from '@langchain/core/output_parsers';

//대화이력 기반 챗봇 구현을 위한 각종 객체 참조하기
//챗봇과의 대화이력정보 관리를 위한 메모리 기반 InMemoryChatMessageHistory 객체 참조하기
import { InMemoryChatMessageHistory } from '@langchain/core/chat_history';

//대화이력 관리를 위한 세부 주요 객체 참조하기
import {
  RunnableWithMessageHistory,
  RunnablePassthrough,
  RunnableSequence,
} from '@langchain/core/runnables';

//OpenAI LLM 패키지 참조하기
import { ChatOpenAI } from '@langchain/openai';
import { send } from 'process';

//백엔드에서 프론트엔드로 전달할 결과 데이터 정의하기
type ResponseData = {
  code: number;
  data: string | null | IMemberMessage;
  msg: string;
};

//메모리 영역에 실제 대화이력이  저장되는 전역변수 선언 및 구조정의
//Record<string:사용자세션아이디, InMemoryChatMessageHistory:사용자별대화이력객체>
const messageHistories: Record<string, InMemoryChatMessageHistory> = {};

//백엔드 REST API 기능을 제공해주는 처리함수 구현하기
//req는 클라이언트에서 서버로 제공되는 각종정보를 포함하는 매개변수이고 타입은 NextApiRequest 입니다.
//res는 백엔드 API에서 클라이언트(프론트엔드=웹브라우저)로 전달할 결과값을 처리하는 객체입니다.
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>,
) {
  //클라이언트로 전달한 최종 데이터 값 정의하기
  const apiResult: ResponseData = {
    code: 400,
    data: null,
    msg: 'failed',
  };

  try {
    if (req.method == 'POST') {
      //Step1: 프론트엔드에서 전달한 데이터값 추출하기
      const nickName = req.body.nickName;
      console.log('사용자 닉네임값 :', nickName);
      const prompt = req.body.message;

      //Step2:LLM모델 생성하기
      const llm = new ChatOpenAI({
        model: 'gpt-4o',
        apiKey: process.env.OPENAI_API_KEY,
      });

      //Step3: LLM과 통신하기
      //Case1:심플 챗봇
      //const result = await llm.invoke(prompt);

      //Case2:역할기반 챗봇 구현하기
      // const messages = [
      //   new SystemMessage('내가 보낸 메시지를 일본어로 번역해줘'),
      //   new HumanMessage(prompt),
      // ];
      // const result = await llm.invoke(messages);

      //Case3:프롬프트 템플릿을 이용한 메시지 전달하고 응답받기
      // const promptTemplate = ChatPromptTemplate.fromMessages([
      //   ['system', ''], //내가 보낸 메시지를 영어로 번역해줘.
      //   ['user', '{input}'],
      // ]);

      //대화이력 기반 챗프롬프트 템플릿 생성하기
      const promptTemplate = ChatPromptTemplate.fromMessages([
        ['system', '당신은 사용자와의 모든 대화이력을 기억합니다.'],
        ['placeholder', '{chat_history}'],
        ['human', '{input}'],
      ]);

      //LLM OutputParser를 이용해 응답메시지를 문자열로 변환하기
      const outputParser = new StringOutputParser();

      //LLM에 질문과 응답과정에서 발생하는 작업의 단위를 체인이라고합니다.
      //여러개의 체인을 연결해 최종 사용자 질문에 대한 응답을 받는 방법을 LangChain에서는 파이프라인이라고 합니다.
      //Case3-1:프롬프트 템플릿을 이용한 메시지 전달하고 응답받기
      // const chain = promptTemplate.pipe(llm);
      // const result = await chain.invoke({ input: prompt });

      //Case3-2:OutputParser를 이용한 2개의 체인(작업을 순서대로)을 실행하기
      const chains = promptTemplate.pipe(llm).pipe(outputParser);

      //대화이력관리를 위한 체인생성(대화이력관리작업)
      //RunnableWithMessageHistory({runnable:llm모델정보,getMessageHistory:()=>{지정된사용자의대화이력반환}},
      //,inputMessagesKey:사용자입력프롬프트값전달,historyMessagesKey:지정된사용자의대화이력정보를 llm에게전달)
      const historyChain = new RunnableWithMessageHistory({
        runnable: chains,
        getMessageHistory: async (sessionId) => {
          //메모리 영역에 해당 세션 아이디 사용자의 대화이력이 없으면 대화이력 관리 객체를 생성해준다.
          if (messageHistories[sessionId] == undefined) {
            messageHistories[sessionId] = new InMemoryChatMessageHistory();
          }
          return messageHistories[sessionId];
        },
        inputMessagesKey: 'input',
        historyMessagesKey: 'chat_history',
      });

      //사용자 세션 아이디 값 구성하기
      //현재 챗봇을 호출한 사용자 아이디값을 세션아이디로 설정해줍니다.
      //추후 프론트엔드서 전달된 사용자아디값을 세션아이디 값으로 설정해주면 되세요..
      const config = {
        configurable: { sessionId: nickName },
      };

      //대화이력관리 기반 챗봇 llm 호출하기
      //historyChain.invoke({input:사용자입력메시지프롬프트},config:현재접속한 사용자정보);
      const resultMessage = await historyChain.invoke(
        { input: prompt },
        config,
      );

      //outputParser파서를 이용했기때문에 invoke 결과값이 AIMessage객체가 아닌 문자열로 반환됩니다.
      //const resultMessage = await chains.invoke({ input: prompt });

      //result 메시지 타입은 AIMessage 타입으로 반환됩니다.
      //console.log('LLM모델에서 전달된 챗봇 응답 결과값:', result);

      //Step4: 챗봇 응답메시지를 프론트엔드 메시지타입으로 변환하여 결과값 반환하기
      const resultMsg: IMemberMessage = {
        user_type: UserType.BOT,
        nick_name: 'Bot',
        message: resultMessage, //result.content as string,
        send_date: new Date(),
      };

      //정상적으로 LLM과 통신이 되었을때 코드영역
      //LLM 챗봇과 통신해서 LLM이 제공해주는 응답값을 받아서 apiResult data값으로 전달하기
      apiResult.code = 200;
      apiResult.data = resultMsg;
      apiResult.msg = 'ok';
    }
  } catch (err) {
    //LLM통신시 에러발생시 예외처리코드 영역
    console.log('백엔드API 호출에러발생:', err);
    apiResult.code = 500;
    apiResult.data = null;
    apiResult.msg = 'failed';
  }

  //클라이언트에 최종 API결과값을 JSON형태로 전달하기
  //res.json()메소드 안에 최종결과 json데이터를 넣어서 클라이언트로 전달합니다.
  res.json(apiResult);
}
