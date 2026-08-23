/*
  Warnings:

  - You are about to drop the `Avilability` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ChatMembers` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Chats` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Comment` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `CommentLikes` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Contrats` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `EventCategories` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `EventRating` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Events` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Guests` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Messages` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Posts` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PostsAnalytics` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Reactions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Seens` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ServiceCategories` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ServiceRating` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Services` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Tagged` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `User` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Avilability" DROP CONSTRAINT "Avilability_serviceFK_fkey";

-- DropForeignKey
ALTER TABLE "ChatMembers" DROP CONSTRAINT "ChatMembers_chatFK_fkey";

-- DropForeignKey
ALTER TABLE "ChatMembers" DROP CONSTRAINT "ChatMembers_userFK_fkey";

-- DropForeignKey
ALTER TABLE "Chats" DROP CONSTRAINT "Chats_eventId_fkey";

-- DropForeignKey
ALTER TABLE "Comment" DROP CONSTRAINT "Comment_postFK_fkey";

-- DropForeignKey
ALTER TABLE "Comment" DROP CONSTRAINT "Comment_userFK_fkey";

-- DropForeignKey
ALTER TABLE "CommentLikes" DROP CONSTRAINT "CommentLikes_commentFK_fkey";

-- DropForeignKey
ALTER TABLE "CommentLikes" DROP CONSTRAINT "CommentLikes_userFK_fkey";

-- DropForeignKey
ALTER TABLE "Contrats" DROP CONSTRAINT "Contrats_eventFK_fkey";

-- DropForeignKey
ALTER TABLE "Contrats" DROP CONSTRAINT "Contrats_serviceFK_fkey";

-- DropForeignKey
ALTER TABLE "EventRating" DROP CONSTRAINT "EventRating_eventFK_fkey";

-- DropForeignKey
ALTER TABLE "EventRating" DROP CONSTRAINT "EventRating_userFK_fkey";

-- DropForeignKey
ALTER TABLE "Events" DROP CONSTRAINT "Events_categoryFK_fkey";

-- DropForeignKey
ALTER TABLE "Events" DROP CONSTRAINT "Events_userFK_fkey";

-- DropForeignKey
ALTER TABLE "Guests" DROP CONSTRAINT "Guests_eventFK_fkey";

-- DropForeignKey
ALTER TABLE "Guests" DROP CONSTRAINT "Guests_userFK_fkey";

-- DropForeignKey
ALTER TABLE "Messages" DROP CONSTRAINT "Messages_chatFK_fkey";

-- DropForeignKey
ALTER TABLE "Messages" DROP CONSTRAINT "Messages_userFK_fkey";

-- DropForeignKey
ALTER TABLE "Posts" DROP CONSTRAINT "Posts_eventFK_fkey";

-- DropForeignKey
ALTER TABLE "Posts" DROP CONSTRAINT "Posts_userFK_fkey";

-- DropForeignKey
ALTER TABLE "PostsAnalytics" DROP CONSTRAINT "PostsAnalytics_postFK_fkey";

-- DropForeignKey
ALTER TABLE "PostsAnalytics" DROP CONSTRAINT "PostsAnalytics_userFK_fkey";

-- DropForeignKey
ALTER TABLE "Reactions" DROP CONSTRAINT "Reactions_messagesFK_fkey";

-- DropForeignKey
ALTER TABLE "Reactions" DROP CONSTRAINT "Reactions_userFK_fkey";

-- DropForeignKey
ALTER TABLE "Seens" DROP CONSTRAINT "Seens_messageFK_fkey";

-- DropForeignKey
ALTER TABLE "Seens" DROP CONSTRAINT "Seens_userFK_fkey";

-- DropForeignKey
ALTER TABLE "ServiceRating" DROP CONSTRAINT "ServiceRating_serviceFK_fkey";

-- DropForeignKey
ALTER TABLE "ServiceRating" DROP CONSTRAINT "ServiceRating_userFK_fkey";

-- DropForeignKey
ALTER TABLE "Services" DROP CONSTRAINT "Services_categoryFK_fkey";

-- DropForeignKey
ALTER TABLE "Services" DROP CONSTRAINT "Services_userFK_fkey";

-- DropForeignKey
ALTER TABLE "Tagged" DROP CONSTRAINT "Tagged_postFK_fkey";

-- DropForeignKey
ALTER TABLE "Tagged" DROP CONSTRAINT "Tagged_userFK_fkey";

-- DropTable
DROP TABLE "Avilability";

-- DropTable
DROP TABLE "ChatMembers";

-- DropTable
DROP TABLE "Chats";

-- DropTable
DROP TABLE "Comment";

-- DropTable
DROP TABLE "CommentLikes";

-- DropTable
DROP TABLE "Contrats";

-- DropTable
DROP TABLE "EventCategories";

-- DropTable
DROP TABLE "EventRating";

-- DropTable
DROP TABLE "Events";

-- DropTable
DROP TABLE "Guests";

-- DropTable
DROP TABLE "Messages";

-- DropTable
DROP TABLE "Posts";

-- DropTable
DROP TABLE "PostsAnalytics";

-- DropTable
DROP TABLE "Reactions";

-- DropTable
DROP TABLE "Seens";

-- DropTable
DROP TABLE "ServiceCategories";

-- DropTable
DROP TABLE "ServiceRating";

-- DropTable
DROP TABLE "Services";

-- DropTable
DROP TABLE "Tagged";

-- DropTable
DROP TABLE "User";

-- DropEnum
DROP TYPE "ContratsPayState";

-- DropEnum
DROP TYPE "GuestsPayState";

-- DropEnum
DROP TYPE "PayType";

-- DropEnum
DROP TYPE "ResType";

-- DropEnum
DROP TYPE "Role";

-- DropEnum
DROP TYPE "Type";
