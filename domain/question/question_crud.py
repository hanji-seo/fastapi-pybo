from datetime import datetime
from domain.question.question_schema import QuestionCreate, QuestionUpdate
from sqlalchemy import and_, or_
from models import Question, User, Answer
from sqlalchemy.orm import Session


def get_question(db: Session, question_id: int):
    return db.query(Question).get(question_id)


def get_question_list(db: Session, skip: int = 0, limit: int = 10, keyword: str = ''):
    # 1. 기본 쿼리 시작
    question_list = db.query(Question).outerjoin(User)

    # 2. 검색어가 있을 경우
    if keyword:
        search = '%%{}%%'.format(keyword)
        # subquery를 사용하지 않고 조인만으로 해결하도록 단순화
        sub_query = db.query(Answer.question_id, Answer.content, User.username.label('answer_username')) \
            .outerjoin(User, Answer.user_id == User.id).subquery()

        question_list = question_list \
            .outerjoin(sub_query, sub_query.c.question_id == Question.id) \
            .filter(
            or_(
                Question.subject.ilike(search),
                Question.content.ilike(search),
                User.username.ilike(search),
                sub_query.c.content.ilike(search),
                sub_query.c.answer_username.ilike(search)
            )
        )

    # 3. 결과 집계 및 페이징
    total = question_list.distinct().count()
    question_list = question_list.order_by(Question.create_date.desc()) \
        .offset(skip).limit(limit).distinct().all()

    return total, question_list


# 나머지 함수는 동일하게 유지
def create_question(db: Session, question_create: QuestionCreate, user: User):
    db_question = Question(subject=question_create.subject,
                           content=question_create.content,
                           create_date=datetime.now(),
                           user=user)
    db.add(db_question)
    db.commit()


def update_question(db: Session, db_question: Question, question_update: QuestionUpdate):
    db_question.subject = question_update.subject
    db_question.content = question_update.content
    db_question.modify_date = datetime.now()
    db.add(db_question)
    db.commit()


def delete_question(db: Session, db_question: Question):
    db.delete(db_question)
    db.commit()


def vote_question(db: Session, db_question: Question, db_user: User):
    db_question.voter.append(db_user)
    db.commit()