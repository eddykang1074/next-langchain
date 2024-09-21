//메시지 인터페이스 정의하고 외부 노출하기
export interface IMessage {
  user_type: UserType;
  message: string;
  send_date: Date;
}

//사용자 타입 열거형 정의하고 외부 노출하기
export enum UserType {
  USER = 'User',
  BOT = 'Bot',
}

//IMessage인터페이스를 상속받아 nick_name속성이 추가된 새로운 인터페이스 정의하기
export interface IMemberMessage extends IMessage {
  nick_name: string;
}
